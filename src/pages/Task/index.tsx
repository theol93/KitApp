import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGetTasksQuery, useAddTaskMutation, useUpdateTaskMutation } from '../../core/api/firestoreApi';
import type { Task } from '../../core/store/types/tasks';
import { TaskForm } from '../../components/tasks/TaskForm';
import Toast from 'react-native-toast-message';

type RouteParams = {
  taskId?: string;
};

export const TaskPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { taskId } = (route.params as RouteParams) ?? {};

  const isEditMode = !!taskId;

  const { data: tasks = [] } = useGetTasksQuery();
  const [addTask, { isLoading: isAdding }] = useAddTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();

  const existingTask = useMemo(() => tasks.find(t => t.id === taskId), [tasks, taskId]);
  const draftKey = useMemo(() => (taskId ? `taskDraft:${taskId}` : 'taskDraft:new'), [taskId]);

  const isSubmitting = isAdding || isUpdating;

  const handleSubmit = async (payload: Omit<Task, 'id'>) => {
    try {
      if (isEditMode && existingTask) {
        await updateTask({ id: existingTask.id, ...payload });
      } else {
        await addTask(payload);
      }
    } catch (error) {
      console.log('Error: ', error);
      Toast.show({
        type: 'error',
        text1: 'Something went wrong!',
        position: 'top',
      });
    }

    navigation.goBack();
  };

  const headerTitle = isEditMode ? 'Edit task' : 'New task';
  const primaryButtonLabel = isEditMode ? 'Save changes' : 'Add task';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'←'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      <TaskForm
        headerTitle={headerTitle}
        primaryButtonLabel={primaryButtonLabel}
        existingTask={existingTask}
        isEditMode={isEditMode}
        isSubmitting={isSubmitting}
        draftKey={draftKey}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050509',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  backButtonText: {
    color: '#9CA3AF',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
