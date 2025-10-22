import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InstalledApp, UsageStats } from '../types';

/**
 * App management store interface
 */
interface AppState {
  // State
  installedApps: InstalledApp[];
  lockedApps: string[];
  usageStats: UsageStats[];
  isLoading: boolean;
  
  // Actions
  setInstalledApps: (apps: InstalledApp[]) => void;
  setLockedApps: (packageNames: string[]) => void;
  toggleAppLock: (packageName: string) => void;
  setUsageStats: (stats: UsageStats[]) => void;
  setLoading: (loading: boolean) => void;
  clearUsageStats: () => void;
  getAppByPackage: (packageName: string) => InstalledApp | undefined;
  isAppLocked: (packageName: string) => boolean;
  getLockedAppsCount: () => number;
  getUnlockedAppsCount: () => number;
}

/**
 * Create the app management store
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      installedApps: [],
      lockedApps: [],
      usageStats: [],
      isLoading: false,

      /**
       * Set the list of installed apps
       * Updates the isLocked property based on lockedApps array
       * 
       * @param apps Array of installed apps
       * 
       * @example
       * const apps = await UsageModule.getInstalledApps();
       * setInstalledApps(apps);
       */
      setInstalledApps: (apps) => {
        const { lockedApps } = get();
        // Mark apps as locked based on lockedApps array
        const appsWithLockStatus = apps.map(app => ({
          ...app,
          isLocked: lockedApps.includes(app.packageName),
        }));
        set({ installedApps: appsWithLockStatus });
      },

      /**
       * Set the list of locked app package names
       * Also updates the isLocked property on installedApps
       * 
       * @param packageNames Array of package names to lock
       * 
       * @example
       * setLockedApps(['com.instagram.android', 'com.twitter.android']);
       */
      setLockedApps: (packageNames) => {
        set({ lockedApps: packageNames });
        
        // Update installed apps to reflect locked status
        const { installedApps } = get();
        const updatedApps = installedApps.map(app => ({
          ...app,
          isLocked: packageNames.includes(app.packageName),
        }));
        set({ installedApps: updatedApps });
      },

      /**
       * Toggle lock status of an app
       * Adds or removes package name from lockedApps array
       * 
       * @param packageName Package name to toggle
       * 
       * @example
       * toggleAppLock('com.facebook.katana');
       */
      toggleAppLock: (packageName) => {
        const { lockedApps, installedApps } = get();
        let updatedLockedApps: string[];

        if (lockedApps.includes(packageName)) {
          // Remove from locked (unlock)
          updatedLockedApps = lockedApps.filter(pkg => pkg !== packageName);
        } else {
          // Add to locked (lock)
          updatedLockedApps = [...lockedApps, packageName];
        }

        set({ lockedApps: updatedLockedApps });

        // Update installed apps to reflect new lock status
        const updatedApps = installedApps.map(app => ({
          ...app,
          isLocked: updatedLockedApps.includes(app.packageName),
        }));
        set({ installedApps: updatedApps });
      },

      /**
       * Set usage statistics
       * Stores usage data for all tracked apps
       * 
       * @param stats Array of usage statistics
       * 
       * @example
       * const stats = await UsageService.getDailyUsage();
       * setUsageStats(stats);
       */
      setUsageStats: (stats) => set({ usageStats: stats }),

      /**
       * Set loading state
       * Used to show loading indicators in UI
       * 
       * @param loading Loading state
       */
      setLoading: (loading) => set({ isLoading: loading }),

      /**
       * Clear all usage statistics
       * Useful for testing or reset functionality
       */
      clearUsageStats: () => set({ usageStats: [] }),

      /**
       * Get an app by package name
       * 
       * @param packageName Package name to search for
       * @returns InstalledApp object or undefined
       * 
       * @example
       * const app = getAppByPackage('com.whatsapp');
       * if (app) {
       *   console.log(app.appName); // "WhatsApp"
       * }
       */
      getAppByPackage: (packageName) => {
        const { installedApps } = get();
        return installedApps.find(app => app.packageName === packageName);
      },

      /**
       * Check if a specific app is locked
       * 
       * @param packageName Package name to check
       * @returns True if app is locked
       * 
       * @example
       * if (isAppLocked('com.instagram.android')) {
       *   console.log('Instagram is locked');
       * }
       */
      isAppLocked: (packageName) => {
        const { lockedApps } = get();
        return lockedApps.includes(packageName);
      },

      /**
       * Get count of locked apps
       * 
       * @returns Number of locked apps
       */
      getLockedAppsCount: () => {
        const { lockedApps } = get();
        return lockedApps.length;
      },

      /**
       * Get count of unlocked apps
       * 
       * @returns Number of unlocked apps
       */
      getUnlockedAppsCount: () => {
        const { installedApps, lockedApps } = get();
        return installedApps.length - lockedApps.length;
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist lockedApps (don't persist installedApps as they change with updates)
      partialize: (state) => ({
        lockedApps: state.lockedApps,
      }),
    }
  )
);