import { store } from './src/core/store/store';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import AppRoutes from './src/router';
import { NavigationContainer } from '@react-navigation/native';

function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <StatusBar barStyle="light-content" />
        <NavigationContainer>
          <AppRoutes />
        </NavigationContainer>
      </Provider>
    </SafeAreaProvider>
  );
}

export default App;
