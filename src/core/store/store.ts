import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasks/tasksReducer';
import settingsReducer from './settings/settingsReducer';
import { firestoreApi } from '../api/firestoreApi';


export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    settings: settingsReducer,
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(firestoreApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;