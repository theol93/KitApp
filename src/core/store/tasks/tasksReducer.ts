import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Task } from '../types/tasks';

interface TasksUIState {
    tasks: Task[];
    selectedTaskId: string | null;
}

const initialState: TasksUIState = {
    tasks: [],
    selectedTaskId: null,
};

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        setTasks(state, action: PayloadAction<Task[]>) {
            state.tasks = action.payload;
        },
        selectTask(state, action: PayloadAction<string | null>) {
            state.selectedTaskId = action.payload;
        },
        addTask(state, action: PayloadAction<Task>) {
            state.tasks.push(action.payload);
        },
        updateTask(state, action: PayloadAction<Task>) {
            const index = state.tasks.findIndex(task => task.id === action.payload.id);
            if (index !== -1) {
                state.tasks[index] = action.payload;
            }
        },
        deleteTask(state, action: PayloadAction<string>) {
            state.tasks = state.tasks.filter(task => task.id !== action.payload);
        },
    },
});

export const { selectTask } = tasksSlice.actions;
export default tasksSlice.reducer;