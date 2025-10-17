import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

/**
 * Theme store for light/dark mode management
 * Supports auto mode that follows system preference
 */

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  
  // Actions
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      isDark: false,

      /**
       * Set theme mode
       * @param mode 'light', 'dark', or 'auto'
       */
      setMode: (mode) => {
        const systemColorScheme = useColorScheme();
        let isDark = false;

        if (mode === 'dark') {
          isDark = true;
        } else if (mode === 'light') {
          isDark = false;
        } else {
          // auto mode
          isDark = systemColorScheme === 'dark';
        }

        set({ mode, isDark });
      },

      /**
       * Toggle between light and dark mode
       * Disables auto mode
       */
      toggleTheme: () => {
        const { mode } = get();
        let newMode: ThemeMode;

        if (mode === 'auto') {
          const systemColorScheme = useColorScheme();
          // If currently following system dark, switch to light
          newMode = systemColorScheme === 'dark' ? 'light' : 'dark';
        } else {
          // Toggle between light and dark
          newMode = mode === 'light' ? 'dark' : 'light';
        }

        get().setMode(newMode);
      },

      /**
       * Initialize theme based on system preference
       * Called on app startup
       */
      initializeTheme: () => {
        const { mode } = get();
        get().setMode(mode);
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;