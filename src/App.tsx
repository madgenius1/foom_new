import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BackgroundFetch from 'react-native-background-fetch';
import AppNavigator from './navigation/AppNavigator';
import { lightTheme, darkTheme } from './theme/theme';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { RewardsService } from './services/rewardsService';

/**
 * Main App Component
 */

const App: React.FC = () => {
  const systemColorScheme = useColorScheme();
  const { mode, isDark, setMode } = useThemeStore();
  const { user } = useAuthStore();

  // Set initial theme based on system preference
  useEffect(() => {
    if (mode === 'auto') {
      setMode('auto');
    }
  }, [systemColorScheme]);

  // Configure background fetch for periodic token rewards
  useEffect(() => {
    configureBackgroundFetch();
  }, []);

  const configureBackgroundFetch = async () => {
    try {
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Minimum 15 minutes
          stopOnTerminate: false,
          enableHeadless: true,
          startOnBoot: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        },
        async (taskId) => {
          console.log('[BackgroundFetch] Task started:', taskId);
          
          // Award tokens for the last tracking window
          if (user) {
            try {
              const endMillis = Date.now();
              const startMillis = endMillis - 60 * 60 * 1000; // Last hour
              await RewardsService.awardTokensForWindow(user.uid, startMillis, endMillis);
            } catch (error) {
              console.error('[BackgroundFetch] Error awarding tokens:', error);
            }
          }

          // Required: Signal completion
          BackgroundFetch.finish(taskId);
        },
        (taskId) => {
          console.log('[BackgroundFetch] Task timeout:', taskId);
          BackgroundFetch.finish(taskId);
        }
      );

      // Check status
      const status = await BackgroundFetch.status();
      console.log('[BackgroundFetch] Status:', status);
    } catch (error) {
      console.error('[BackgroundFetch] Configuration error:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;