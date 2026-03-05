import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../store/types/tasks';
import Toast from 'react-native-toast-message';

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Task'],
  endpoints: builder => ({
    getTasks: builder.query<Task[], void>({
      async queryFn() {
        return { data: [] };
      },
      async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;

          const q = collection(db, 'tasks');
          unsubscribe = onSnapshot(q, snapshot => {
            updateCachedData(draft => {
              draft.length = 0;
              snapshot.docs.forEach(item => {
                draft.push({ id: item.id, ...item.data() } as Task);
              });
            });
          });
        } catch {
          Toast.show({
            type: 'error',
            text1: 'Something went wrong!',
            position: 'top',
          });
        }

        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    addTask: builder.mutation<void, Omit<Task, 'id'>>({
      async queryFn(task) {
        try {
          await addDoc(collection(db, 'tasks'), {
            ...task,
            updatedAt: Date.now(),
          });
          Toast.show({
            type: 'success',
            text1: 'Task added successfully!',
            position: 'top',
          });
          return { data: undefined };
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Something went wrong!',
            position: 'top',
          });
          return { error };
        }
      },
      invalidatesTags: ['Task'],
    }),

    updateTask: builder.mutation<void, Partial<Task> & { id: string }>({
      async queryFn({ id, ...data }) {
        try {
          await updateDoc(doc(db, 'tasks', id), {
            ...data,
            updatedAt: Date.now(),
          });

          Toast.show({
            type: 'success',
            text1: 'Task updated successfully!',
            position: 'top',
          });

          return { data: undefined };
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Something went wrong!',
            position: 'top',
          });
          return { error };
        }
      },
      invalidatesTags: ['Task'],
    }),

    deleteTask: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteDoc(doc(db, 'tasks', id));
          Toast.show({
            type: 'success',
            text1: 'Task deleted successfully!',
            position: 'top',
          });

          return { data: undefined };
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Something went wrong!',
            position: 'top',
          });
          return { error };
        }
      },
      invalidatesTags: ['Task'],
    }),
  }),
});

export const { useGetTasksQuery, useAddTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } = firestoreApi;
