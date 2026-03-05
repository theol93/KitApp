import React, { useEffect, useRef } from 'react';
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
import { Controller, Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task, TaskPriority, TaskStatus } from '../../core/store/types/tasks';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').default(''),
  status: z.enum(['pending', 'completed'] as const),
  priority: z.enum(['low', 'medium', 'high'] as const),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  deadlineDate: z.date(),
  category: z.string().max(50, 'Category is too long').default(''),
  localImageUri: z.string().optional(),
  imageUrl: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

type TaskFormProps = {
  headerTitle: string;
  primaryButtonLabel: string;
  existingTask?: Task;
  isEditMode: boolean;
  isSubmitting: boolean;
  draftKey: string;
  onSubmit: (payload: Omit<Task, 'id'>) => Promise<void>;
};

const defaultTaskValues: TaskFormValues = {
  title: '',
  description: '',
  status: 'pending',
  priority: 'medium',
  deadline: dayjs().add(1, 'day').format('YYYY-MM-DD'),
  deadlineDate: dayjs().add(1, 'day').toDate(),
  category: '',
  localImageUri: undefined,
  imageUrl: undefined,
};

export const TaskForm: React.FC<TaskFormProps> = ({
  primaryButtonLabel,
  existingTask,
  isSubmitting,
  draftKey,
  onSubmit,
}) => {
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeadlinePicker, setShowDeadlinePicker] = React.useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema) as Resolver<TaskFormValues>,
    defaultValues: defaultTaskValues,
    mode: 'onChange',
  });

  const watchedValues = watch();

  useEffect(() => {
    if (existingTask) {
      reset({
        title: existingTask.title,
        description: existingTask.description ?? '',
        status: existingTask.status,
        priority: existingTask.priority,
        deadline: existingTask.deadline,
        deadlineDate: dayjs(existingTask.deadline).toDate(),
        category: existingTask.category,
        imageUrl: existingTask.imageUrl,
        localImageUri: existingTask.imageUrl,
      });
    }
  }, [existingTask, reset]);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        if (!raw) return;

        const draft = JSON.parse(raw) as Partial<TaskFormValues>;

        if (draft.title !== undefined) setValue('title', draft.title);
        if (draft.description !== undefined) setValue('description', draft.description);
        if (draft.status !== undefined) setValue('status', draft.status);
        if (draft.priority !== undefined) setValue('priority', draft.priority);
        if (draft.deadline) {
          setValue('deadline', draft.deadline);
          setValue('deadlineDate', dayjs(draft.deadline).toDate());
        }
        if (draft.category !== undefined) setValue('category', draft.category);
        if (draft.imageUrl !== undefined) {
          setValue('imageUrl', draft.imageUrl);
          setValue('localImageUri', draft.imageUrl);
        }
      } catch (error) {
        console.log('Error loading draft:', error);
      }
    };

    loadDraft();
  }, [draftKey, setValue]);

  useEffect(() => {
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);

    autosaveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify(watchedValues));
    }, 500);

    return () => {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    };
  }, [watchedValues, draftKey]);

  const handleDeadlineChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setShowDeadlinePicker(false);
      return;
    }
    const currentDate = selected ?? watchedValues.deadlineDate;
    setShowDeadlinePicker(false);
    setValue('deadlineDate', currentDate, { shouldValidate: true });
    setValue('deadline', dayjs(currentDate).format('YYYY-MM-DD'), { shouldValidate: true });
  };

  const handlePickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response: { didCancel?: boolean; errorCode?: string; assets?: Asset[] }) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (asset?.uri) {
          setValue('localImageUri', asset.uri, { shouldValidate: true });
        }
      }
    );
  };

  const onFormSubmit = (data: TaskFormValues) => {
    const payload: Omit<Task, 'id'> = {
      title: data.title.trim(),
      description: data.description?.trim() ?? '',
      status: data.status,
      priority: data.priority,
      deadline: dayjs(data.deadlineDate).format('YYYY-MM-DD'),
      category: data.category?.trim() || 'General',
      updatedAt: Date.now(),
    };
    onSubmit(payload);
  };

  const canSubmit = isValid && !isSubmitting;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Task title"
                placeholderTextColor="#6B7280"
                style={[styles.input, !!errors.title && styles.inputError]}
              />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Add more details..."
                placeholderTextColor="#6B7280"
                style={[styles.input, styles.inputMultiline, !!errors.description && styles.inputError]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Image</Text>
          <Controller
            control={control}
            name="localImageUri"
            render={({ field: { value } }) => (
              <>
                {value && (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: value }} style={styles.imagePreview} />
                  </View>
                )}
                <Pressable onPress={handlePickImage} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{value ? 'Change image' : 'Attach image'}</Text>
                </Pressable>
              </>
            )}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.rowItem]}>
            <Text style={styles.label}>Status</Text>
            <Controller
              control={control}
              name="status"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {(['pending', 'completed'] as TaskStatus[]).map(s => {
                    const active = value === s;
                    return (
                      <Pressable key={s} onPress={() => onChange(s)} style={[styles.chip, active && styles.chipActive]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {s === 'pending' ? 'Pending' : 'Completed'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          <View style={[styles.field, styles.rowItem]}>
            <Text style={styles.label}>Priority</Text>
            <Controller
              control={control}
              name="priority"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {(['low', 'medium', 'high'] as TaskPriority[]).map(p => {
                    const active = value === p;
                    return (
                      <Pressable key={p} onPress={() => onChange(p)} style={[styles.chip, active && styles.chipActive]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.rowItem]}>
            <Text style={styles.label}>Deadline</Text>
            <Controller
              control={control}
              name="deadline"
              render={({ field: { value } }) => (
                <>
                  <Pressable
                    onPress={() => setShowDeadlinePicker(true)}
                    style={[styles.input, styles.deadlineInput, !!errors.deadline && styles.inputError]}
                  >
                    <Text style={styles.deadlineText}>{value}</Text>
                  </Pressable>
                  {showDeadlinePicker && (
                    <DateTimePicker
                      value={watchedValues.deadlineDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDeadlineChange}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}
            />
            {errors.deadline && <Text style={styles.errorText}>{errors.deadline.message}</Text>}
          </View>

          <View style={[styles.field, styles.rowItem]}>
            <Text style={styles.label}>Category</Text>
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Work, Personal, ..."
                  placeholderTextColor="#6B7280"
                  style={[styles.input, !!errors.category && styles.inputError]}
                />
              )}
            />
            {errors.category && <Text style={styles.errorText}>{errors.category.message}</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit(onFormSubmit)}
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#EF4444',
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
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
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
