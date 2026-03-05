import { configureStore } from '@reduxjs/toolkit';
import { firestoreApi } from '../api/firestoreApi';

export const store = configureStore({
  reducer: {
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(firestoreApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;