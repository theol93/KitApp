import { combineReducers } from 'redux';
import tasksReducer from './tasks/tasksReducer';

const rootReducer = combineReducers({
    tasks: tasksReducer
});

export default rootReducer;
