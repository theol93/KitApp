import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useGetTasksQuery, useAddTaskMutation, useUpdateTaskMutation } from '../../core/api/firestoreApi';
// import { storage } from '../../core/firebase';
import type { Task, TaskPriority, TaskStatus } from '../../core/store/types/tasks';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [category, setCategory] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<Date>(dayjs().add(1, 'day').toDate());
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [localImageUri, setLocalImageUri] = useState<string | undefined>(undefined);
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialUpdatedAtRef = useRef<number | null>(null);

  const getDraftKey = useMemo(() => (taskId ? `taskDraft:${taskId}` : 'taskDraft:new'), [taskId]);

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description ?? '');
      setStatus(existingTask.status);
      setPriority(existingTask.priority);
      setDeadline(existingTask.deadline);
      setDeadlineDate(dayjs(existingTask.deadline).toDate());
      setCategory(existingTask.category);
      setImageUrl(existingTask.imageUrl);
      setLocalImageUri(existingTask.imageUrl);
      if (initialUpdatedAtRef.current === null) {
        initialUpdatedAtRef.current = existingTask.updatedAt ?? null;
      }
    }
  }, [existingTask]);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(getDraftKey);
        if (!raw) {
          return;
        }
        const draft = JSON.parse(raw) as {
          title?: string;
          description?: string;
          status?: TaskStatus;
          priority?: TaskPriority;
          deadline?: string;
          category?: string;
          imageUrl?: string;
        };

        if (draft.title !== undefined) setTitle(draft.title);
        if (draft.description !== undefined) setDescription(draft.description);
        if (draft.status !== undefined) setStatus(draft.status);
        if (draft.priority !== undefined) setPriority(draft.priority);
        if (draft.deadline) {
          setDeadline(draft.deadline);
          setDeadlineDate(dayjs(draft.deadline).toDate());
        }
        if (draft.category !== undefined) setCategory(draft.category);
        if (draft.imageUrl !== undefined) {
          setImageUrl(draft.imageUrl);
          setLocalImageUri(draft.imageUrl);
        }
      } catch {
        // ignore draft load errors
      }
    };

    loadDraft();
  }, [getDraftKey]);

  const isSubmitting = isAdding || isUpdating;

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    if (isEditMode && existingTask && initialUpdatedAtRef.current !== null) {
      const latestUpdatedAt = existingTask.updatedAt ?? 0;
      if (latestUpdatedAt !== initialUpdatedAtRef.current) {
        Alert.alert(
          'Task updated elsewhere',
          'This task was changed on another device while you were editing. What would you like to do?',
          [
            {
              text: 'Reload changes',
              style: 'default',
              onPress: () => {
                // reload current task state from latest data
                setTitle(existingTask.title);
                setDescription(existingTask.description ?? '');
                setStatus(existingTask.status);
                setPriority(existingTask.priority);
                setDeadline(existingTask.deadline);
                setDeadlineDate(dayjs(existingTask.deadline).toDate());
                setCategory(existingTask.category);
                setImageUrl(existingTask.imageUrl);
                setLocalImageUri(existingTask.imageUrl);
                initialUpdatedAtRef.current = existingTask.updatedAt ?? null;
              },
            },
            {
              text: 'Overwrite anyway',
              style: 'destructive',
              onPress: () => {
                initialUpdatedAtRef.current = existingTask.updatedAt ?? null;
                handleSave();
              },
            },
          ]
        );
        return;
      }
    }

    const payload: Omit<Task, 'id'> = {
      title: title.trim(),
      description: description.trim() || '',
      status,
      priority,
      deadline: dayjs(deadlineDate).format('YYYY-MM-DD'),
      category: category.trim() || 'General',
      updatedAt: Date.now(),
    };

    try {
      if (isEditMode && existingTask) {
        await updateTask({ id: existingTask.id, ...payload });
      } else {
        await addTask(payload);
      }
      await AsyncStorage.removeItem(getDraftKey);
    } finally {
      // even if removeItem fails we still navigate back
    }

    navigation.goBack();
  };

  const headerTitle = isEditMode ? 'Edit task' : 'New task';
  const primaryButtonLabel = isEditMode ? 'Save changes' : 'Add task';

  const handleDeadlineChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setShowDeadlinePicker(false);
      return;
    }
    const currentDate = selected ?? deadlineDate;
    setShowDeadlinePicker(false);
    setDeadlineDate(currentDate);
    setDeadline(dayjs(currentDate).format('YYYY-MM-DD'));
  };

  const handlePickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response: { didCancel?: boolean; errorCode?: string; assets?: Asset[] }) => {
        if (response.didCancel || response.errorCode) {
          return;
        }
        const asset = response.assets && (response.assets[0] as Asset | undefined);
        if (asset?.uri) {
          setLocalImageUri(asset.uri);
        }
      }
    );
  };

  // const uploadTaskImage = async (uri: string): Promise<string> => {
  //   const response = await fetch(uri);
  //   const blob = await response.blob();
  //   const fileName = `task-${taskId ?? Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  //   const storageRef = ref(storage, `tasks/${fileName}`);
  //   await uploadBytes(storageRef, blob);
  //   return getDownloadURL(storageRef);
  // };

  useEffect(() => {
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }

    const draft = {
      title,
      description,
      status,
      priority,
      deadline,
      category,
      imageUrl: localImageUri ?? imageUrl,
    };

    autosaveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(getDraftKey, JSON.stringify(draft)).catch(() => {
        // ignore autosave errors
      });
    }, 500);

    return () => {
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, [title, description, status, priority, deadline, category, localImageUri, imageUrl, getDraftKey]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'←'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.inputMultiline]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Image</Text>
            {localImageUri && (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: localImageUri }} style={styles.imagePreview} />
              </View>
            )}
            <Pressable onPress={handlePickImage} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{localImageUri ? 'Change image' : 'Attach image'}</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {(['pending', 'completed'] as TaskStatus[]).map(s => {
                  const active = status === s;
                  return (
                    <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, active && styles.chipActive]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {s === 'pending' ? 'Pending' : 'Completed'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipRow}>
                {(['low', 'medium', 'high'] as TaskPriority[]).map(p => {
                  const active = priority === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Deadline</Text>
              <Pressable onPress={() => setShowDeadlinePicker(true)} style={[styles.input, styles.deadlineInput]}>
                <Text style={styles.deadlineText}>{deadline}</Text>
              </Pressable>
              {showDeadlinePicker && (
                <DateTimePicker
                  value={deadlineDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDeadlineChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Work, Personal, ..."
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={isSubmitting || !title.trim()}
            style={[styles.primaryButton, (isSubmitting || !title.trim()) && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 100,
  },
  deadlineInput: {
    justifyContent: 'center',
  },
  deadlineText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#111827',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    color: '#E5E7EB',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  imagePreviewWrapper: {
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4F46E5',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F2937',
    backgroundColor: '#050509',
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
