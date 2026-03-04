import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useGetTasksQuery } from '../../core/api/firestoreApi';
import type { Task } from '../../core/store/types/tasks';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type SortKey = 'deadline' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 20;

const BottomSheetBackdropComponent = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);

export const TasksPage = () => {
  const navigation = useNavigation();
  const { data: tasks = [], isLoading } = useGetTasksQuery();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const bottomSheetRef = useRef<BottomSheet | null>(null);

  const bottomSheetSnapPoints = useMemo(() => ['70%'], []);

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

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <Pressable onPress={() => handlePressTask(item.id)} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={[styles.badge, styles[`badgePriority_${item.priority}`]]}>
            <Text style={styles.badgeText}>{item.priority}</Text>
          </View>
        </View>
        {!!item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.taskFooter}>
          <Text style={styles.taskMeta}>Due {item.deadline}</Text>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.category}</Text>
          </View>
        </View>
      </Pressable>
    ),
    [handlePressTask]
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
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptySubtitle}>Create your first task to get started.</Text>
            </View>
          ) : null
        }
      />

      <GestureHandlerRootView style={styles.container}>
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
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
              <Text
                style={[styles.bottomSheetOptionText, sortKey === 'deadline' && styles.bottomSheetOptionTextActive]}
              >
                Deadline
              </Text>
            </Pressable>
            <Pressable
              style={[styles.bottomSheetOption, sortKey === 'priority' && styles.bottomSheetOptionActive]}
              onPress={() => handleSelectSortKey('priority')}
            >
              <Text
                style={[styles.bottomSheetOptionText, sortKey === 'priority' && styles.bottomSheetOptionTextActive]}
              >
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
      </GestureHandlerRootView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
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
