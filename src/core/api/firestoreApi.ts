import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../store/types/tasks';

export const firestoreApi = createApi({
    reducerPath: 'firestoreApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Task'],
    endpoints: (builder) => ({
        getTasks: builder.query<Task[], void>({
            async queryFn() {
                try {
                    const snapshot = await getDocs(collection(db, 'tasks'));
                    const tasks = snapshot.docs.map((item) => ({
                        id: item.id,
                        ...item.data(),
                    })) as Task[];

                    return { data: tasks };
                } catch (error) {
                    return { error };
                }
            },
            providesTags: ['Task'],
        }),

        addTask: builder.mutation<void, Omit<Task, 'id'>>({
            async queryFn(task) {
                try {
                    await addDoc(collection(db, 'tasks'), task);
                    return { data: undefined };
                } catch (error) {
                    return { error };
                }
            },
            invalidatesTags: ['Task'],
        }),

        updateTask: builder.mutation<void, Partial<Task> & { id: string }>({
            async queryFn({ id, ...data }) {
                try {
                    await updateDoc(doc(db, 'tasks', id), data);
                    return { data: undefined };
                } catch (error) {
                    return { error };
                }
            },
            invalidatesTags: ['Task'],
        }),

        deleteTask: builder.mutation<void, string>({
            async queryFn(id) {
                try {
                    await deleteDoc(doc(db, 'tasks', id));
                    return { data: undefined };
                } catch (error) {
                    return { error };
                }
            },
            invalidatesTags: ['Task'],
        }),
    }),
});

export const {
    useGetTasksQuery,
    useAddTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
} = firestoreApi;