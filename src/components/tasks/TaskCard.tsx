import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Task } from '../../core/store/types/tasks';
import dayjs from 'dayjs';

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

type TaskCardProps = {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onToggleComplete, onDelete }) => {
  const deadlineSeverity = useMemo(
    () => getDeadlineSeverity(task.deadline, task.status),
    [task.deadline, task.status]
  );

  return (
    <Pressable onPress={onPress} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, task.status === 'completed' && styles.taskTitleCompleted]}>{task.title}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{task.status === 'completed' ? 'Completed' : 'Pending'}</Text>
        </View>
      </View>
      {!!task.description && (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {task.description}
        </Text>
      )}
      <View style={styles.taskFooter}>
        <View style={styles.deadlineRow}>
          <View style={[styles.deadlineDot, styles[`deadlineDot_${deadlineSeverity}`]]} />
          <Text style={styles.taskMeta}>Due {task.deadline}</Text>
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{task.category}</Text>
        </View>
      </View>
      <View style={styles.taskActionsRow}>
        <TouchableOpacity
          onPress={onToggleComplete}
          style={[styles.actionButton, task.status === 'completed' && styles.actionButtonSecondary]}
        >
          <Text style={styles.actionButtonText}>{task.status === 'completed' ? 'Mark pending' : 'Mark done'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.actionButton, styles.actionButtonDanger]}>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
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
});

