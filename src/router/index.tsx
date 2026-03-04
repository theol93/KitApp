import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TasksPage } from '../pages/Tasks';
import { TaskPage } from '../pages/Task';

const Stack = createNativeStackNavigator();

const AppRoutes = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tasks" component={TasksPage} />
      <Stack.Screen name="Task" component={TaskPage} />
    </Stack.Navigator>
  );
};

export default AppRoutes;
