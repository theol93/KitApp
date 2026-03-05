import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import dayjs from 'dayjs';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task, TaskPriority, TaskStatus } from '../../core/store/types/tasks';

type TaskFormProps = {
  headerTitle: string;
  primaryButtonLabel: string;
  existingTask?: Task;
  isEditMode: boolean;
  isSubmitting: boolean;
  draftKey: string;
  onSubmit: (payload: Omit<Task, 'id'>, opts?: { overwrite?: boolean }) => Promise<void> | void;
};

export const TaskForm: React.FC<TaskFormProps> = ({
  primaryButtonLabel,
  existingTask,
  isSubmitting,
  draftKey,
  onSubmit,
}) => {
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

  const getDraftKey = useMemo(() => draftKey, [draftKey]);

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
      } catch (error) {
        console.log('Error: ', error);
      }
    };

    loadDraft();
  }, [getDraftKey]);

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
      AsyncStorage.setItem(getDraftKey, JSON.stringify(draft));
    }, 500);

    return () => {
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, [title, description, status, priority, deadline, category, localImageUri, imageUrl, getDraftKey]);

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
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

    onSubmit(payload);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                  <Pressable key={p} onPress={() => setPriority(p)} style={[styles.chip, active && styles.chipActive]}>
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
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050509',
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
