import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TasksFilter = 'default' | 'status' | 'priority' | 'category' | 'deadline';


interface SettingsState {
    tasksFilter: TasksFilter;
}

const initialState: SettingsState = {
    tasksFilter: 'default',
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setTaskFilter(state, action: PayloadAction<TasksFilter>) {
            state.tasksFilter = action.payload;
        },
    },
});

export const { setTaskFilter } = settingsSlice.actions;
export default settingsSlice.reducer;