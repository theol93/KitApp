import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useGetTasksQuery, useUpdateTaskMutation, useDeleteTaskMutation } from '../../core/api/firestoreApi';
import type { Task } from '../../core/store/types/tasks';

type SortKey = 'deadline' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 5;

type DeadlineSeverity = 'ok' | 'soon' | 'overdue';

const getDeadlineSeverity = (deadline: string, status: Task['status']): DeadlineSeverity => {
  if (status === 'completed') {
    return 'ok';
  }

  const deadlineDate = dayjs(deadline, 'YYYY-MM-DD', true);
  if (!deadlineDate.isValid()) {
    return 'ok';
  }

  const diffDays = deadlineDate.startOf('day').diff(dayjs().startOf('day'), 'day');

  if (diffDays < 0) {
    return 'overdue';
  }

  if (diffDays <= 2) {
    return 'soon';
  }

  return 'ok';
};

const BottomSheetBackdropComponent = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);

export const TasksPage = () => {
  const navigation = useNavigation();
  const { data: tasks = [], isLoading, isFetching, refetch } = useGetTasksQuery();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const bottomSheetRef = useRef<BottomSheet | null>(null);

  const bottomSheetSnapPoints = useMemo(() => ['50%'], []);

  const categories = useMemo(() => {
    const allCategories = Array.from(new Set(tasks.map(task => task.category).filter(Boolean)));

    return ['All', ...allCategories];
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result: Task[] = tasks;

    if (selectedCategory !== 'All') {
      result = result.filter(task => task.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        task => task.title.toLowerCase().includes(q) || (task.description ?? '').toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortKey === 'deadline') {
        const aTime = new Date(a.deadline).getTime();
        const bTime = new Date(b.deadline).getTime();
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      if (sortKey === 'priority') {
        const priorityOrder: Record<Task['priority'], number> = {
          low: 0,
          medium: 1,
          high: 2,
        };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];

        return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      }

      // status
      const statusOrder: Record<Task['status'], number> = {
        pending: 0,
        completed: 1,
      };
      const aStatus = statusOrder[a.status];
      const bStatus = statusOrder[b.status];

      return sortDirection === 'asc' ? aStatus - bStatus : bStatus - aStatus;
    });

    return result;
  }, [tasks, selectedCategory, search, sortKey, sortDirection]);

  const paginatedTasks = useMemo(
    () => filteredAndSortedTasks.slice(0, visibleCount),
    [filteredAndSortedTasks, visibleCount]
  );

  const toggleSort = useCallback(() => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const openSortSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSelectSortKey = useCallback((key: SortKey) => {
    setSortKey(key);
    bottomSheetRef.current?.close();
  }, []);

  const handleEndReached = useCallback(() => {
    if (visibleCount < filteredAndSortedTasks.length) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [visibleCount, filteredAndSortedTasks.length]);

  const handlePressTask = useCallback(
    (taskId: string) => {
      // @ts-expect-error: simple navigation without strict typing
      navigation.navigate('Task', { taskId });
    },
    [navigation]
  );

  const handleToggleComplete = useCallback(
    async (task: Task) => {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateTask({ id: task.id, status: nextStatus });
    },
    [updateTask]
  );

  const handleDeleteTask = useCallback(
    (task: Task) => {
      Alert.alert('Delete task', `Are you sure you want to delete "${task.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(task.id),
        },
      ]);
    },
    [deleteTask]
  );

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <Pressable onPress={() => handlePressTask(item.id)} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskTitleCompleted]}>{item.title}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{item.status === 'completed' ? 'Completed' : 'Pending'}</Text>
          </View>
        </View>
        {!!item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.taskFooter}>
          <View style={styles.deadlineRow}>
            <View
              style={[styles.deadlineDot, styles[`deadlineDot_${getDeadlineSeverity(item.deadline, item.status)}`]]}
            />
            <Text style={styles.taskMeta}>Due {item.deadline}</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.taskActionsRow}>
          <TouchableOpacity
            onPress={() => handleToggleComplete(item)}
            style={[styles.actionButton, item.status === 'completed' && styles.actionButtonSecondary]}
          >
            <Text style={styles.actionButtonText}>{item.status === 'completed' ? 'Mark pending' : 'Mark done'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteTask(item)}
            style={[styles.actionButton, styles.actionButtonDanger]}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    ),
    [handlePressTask, handleToggleComplete, handleDeleteTask]
  );

  const renderCategory = useCallback(
    ({ item }: { item: string }) => {
      const isActive = item === selectedCategory;
      return (
        <Pressable
          onPress={() => {
            setSelectedCategory(item);
            setVisibleCount(PAGE_SIZE);
          }}
          style={[styles.categoryChip, isActive && styles.categoryChipActive]}
        >
          <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{item}</Text>
        </Pressable>
      );
    },
    [selectedCategory]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Task' as never)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            placeholder="Search tasks"
            placeholderTextColor="#777"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.sortButtons}>
          <TouchableOpacity onPress={openSortSheet} style={styles.sortButton}>
            <Text style={styles.sortButtonText}>
              Sort: {sortKey === 'deadline' ? 'Deadline' : sortKey === 'priority' ? 'Priority' : 'Status'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSort} style={styles.sortButton}>
            <Text style={styles.sortButtonText}>{sortDirection === 'asc' ? '↑' : '↓'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={item => item}
          renderItem={renderCategory}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <FlatList
        data={paginatedTasks}
        keyExtractor={item => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.3}
        onEndReached={handleEndReached}
        refreshing={isFetching}
        onRefresh={refetch}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptySubtitle}>Create your first task to get started.</Text>
            </View>
          ) : null
        }
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={bottomSheetSnapPoints}
        backdropComponent={BottomSheetBackdropComponent}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Pressable
            style={[styles.bottomSheetOption, sortKey === 'deadline' && styles.bottomSheetOptionActive]}
            onPress={() => handleSelectSortKey('deadline')}
          >
            <Text style={[styles.bottomSheetOptionText, sortKey === 'deadline' && styles.bottomSheetOptionTextActive]}>
              Deadline
            </Text>
          </Pressable>
          <Pressable
            style={[styles.bottomSheetOption, sortKey === 'priority' && styles.bottomSheetOptionActive]}
            onPress={() => handleSelectSortKey('priority')}
          >
            <Text style={[styles.bottomSheetOptionText, sortKey === 'priority' && styles.bottomSheetOptionTextActive]}>
              Priority
            </Text>
          </Pressable>
          <Pressable
            style={[styles.bottomSheetOption, sortKey === 'status' && styles.bottomSheetOptionActive]}
            onPress={() => handleSelectSortKey('status')}
          >
            <Text style={[styles.bottomSheetOptionText, sortKey === 'status' && styles.bottomSheetOptionTextActive]}>
              Status
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050509',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    marginTop: -2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  searchInput: {
    backgroundColor: '#191919',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#191919',
    marginLeft: 6,
  },
  sortButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 8,
    backgroundColor: '#0D0D0D',
  },
  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryChipText: {
    color: '#E5E5E5',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  taskCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  taskTitleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 13,
    color: '#C4C4C4',
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#1F2937',
  },
  categoryPillText: {
    fontSize: 11,
    color: '#E5E7EB',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#1F2937',
  },
  statusPillText: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#0B0B0B',
  },
  badgePriority_low: {
    backgroundColor: '#6EE7B7',
  },
  badgePriority_medium: {
    backgroundColor: '#FBBF24',
  },
  badgePriority_high: {
    backgroundColor: '#F87171',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  deadlineDot_ok: {
    backgroundColor: '#10B981',
  },
  deadlineDot_soon: {
    backgroundColor: '#F59E0B',
  },
  deadlineDot_overdue: {
    backgroundColor: '#EF4444',
  },
  taskActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#374151',
  },
  actionButtonSecondary: {
    backgroundColor: '#4B5563',
  },
  actionButtonDanger: {
    backgroundColor: '#B91C1C',
  },
  actionButtonText: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  bottomSheetBackground: {
    backgroundColor: '#050509',
  },
  bottomSheetHandle: {
    backgroundColor: '#4B5563',
  },
  bottomSheetContent: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  bottomSheetOption: {
    paddingVertical: 10,
  },
  bottomSheetOptionActive: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  bottomSheetOptionText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  bottomSheetOptionTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
