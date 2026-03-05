import { NativeStackScreenProps } from '@react-navigation/native-stack';


export type RootStackParamList = {
    Tasks: undefined;
    Task: { taskId: string }
};

export type TasksProps = NativeStackScreenProps<RootStackParamList, 'Tasks'>;
export type TaskProps = NativeStackScreenProps<RootStackParamList, 'Task'>;