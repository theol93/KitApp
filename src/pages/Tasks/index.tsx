import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useGetTasksPageQuery, useUpdateTaskMutation, useDeleteTaskMutation } from '../../core/api/firestoreApi';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TaskCategoryChips } from '../../components/tasks/TaskCategoryChips';
import type { Task } from '../../core/store/types/tasks';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../router/types';

enum SortKey {
  Deadline = 'deadline',
  Priority = 'priority',
  Status = 'status',
}

enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

const PAGE_SIZE = 5;

const BottomSheetBackdropComponent = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);

export const TasksPage = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cursor, setCursor] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { data: pageData, isLoading, isFetching } = useGetTasksPageQuery({ limit: PAGE_SIZE, cursor });
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(SortKey.Deadline);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Asc);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const bottomSheetRef = useRef<BottomSheet | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!pageData?.tasks) {
      return;
    }

    setTasks(prev => {
      if (!cursor) {
        return pageData.tasks;
      }

      const existingIds = new Set(prev.map(task => task.id));
      const newTasks = pageData.tasks.filter(task => !existingIds.has(task.id));

      return [...prev, ...newTasks];
    });
  }, [pageData, cursor]);

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

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
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
  }, [tasks, selectedCategory, debouncedSearch, sortKey, sortDirection]);

  const hasMore = !!pageData?.nextCursor;

  const toggleSort = useCallback(() => {
    setSortDirection(prev => (prev === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc));
  }, []);

  const openSortSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSelectSortKey = useCallback((key: SortKey) => {
    setSortKey(key);
    bottomSheetRef.current?.close();
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isFetching && !isLoading && pageData?.nextCursor != null) {
      setCursor(pageData.nextCursor);
    }
  }, [hasMore, isFetching, isLoading, pageData]);

  const handlePressTask = useCallback(
    (taskId: string) => {
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
            value={searchInput}
            onChangeText={setSearchInput}
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

      <TaskCategoryChips categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />

      <FlatList
        data={filteredAndSortedTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => handlePressTask(item.id)}
            onToggleComplete={() => handleToggleComplete(item)}
            onDelete={() => handleDeleteTask(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={isFetching || isLoading}
              >
                <Text style={styles.loadMoreButtonText}>{isFetching || isLoading ? 'Loading…' : 'Load more'}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
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
            onPress={() => handleSelectSortKey(SortKey.Deadline)}
          >
            <Text style={[styles.bottomSheetOptionText, sortKey === 'deadline' && styles.bottomSheetOptionTextActive]}>
              Deadline
            </Text>
          </Pressable>
          <Pressable
            style={[styles.bottomSheetOption, sortKey === 'priority' && styles.bottomSheetOptionActive]}
            onPress={() => handleSelectSortKey(SortKey.Priority)}
          >
            <Text style={[styles.bottomSheetOptionText, sortKey === 'priority' && styles.bottomSheetOptionTextActive]}>
              Priority
            </Text>
          </Pressable>
          <Pressable
            style={[styles.bottomSheetOption, sortKey === 'status' && styles.bottomSheetOptionActive]}
            onPress={() => handleSelectSortKey(SortKey.Status)}
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
  listContent: {
    paddingBottom: 24,
  },
  loadMoreContainer: {
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#374151',
  },
  loadMoreButtonText: {
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
