import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import BackgroundFetch from 'react-native-background-fetch';

// Headless task for background fetch
const BackgroundFetchHeadlessTask = async (event) => {
  const taskId = event.taskId;
  const isTimeout = event.timeout;

  if (isTimeout) {
    console.log('[BackgroundFetch] Headless TIMEOUT:', taskId);
    BackgroundFetch.finish(taskId);
    return;
  }

  console.log('[BackgroundFetch] Headless event received:', taskId);

  // Perform background work here
  // Note: You'll need to initialize Firebase and check for user auth state

  BackgroundFetch.finish(taskId);
};

// Register headless task
BackgroundFetch.registerHeadlessTask(BackgroundFetchHeadlessTask);

AppRegistry.registerComponent(appName, () => App);
