import { NativeModules, Platform } from 'react-native';
import type { UsageStats } from '../types';

const { UsageModule } = NativeModules;


export class UsageService {

  static async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('Usage tracking only available on Android');
      return false;
    }

    try {
      const granted = await UsageModule.requestUsagePermission();
      return granted;
    } catch (error) {
      console.error('Error requesting usage permission:', error);
      return false;
    }
  }

  /**
   * Check if usage permission is granted
   */
  static async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const hasPermission = await UsageModule.hasUsagePermission();
      return hasPermission;
    } catch (error) {
      console.error('Error checking usage permission:', error);
      return false;
    }
  }

  /**
   * Get usage statistics for a time window
   * @param startMillis Start time in milliseconds
   * @param endMillis End time in milliseconds
   * @returns Array of usage stats per app
   */
  static async getUsageStats(
    startMillis: number,
    endMillis: number
  ): Promise<UsageStats[]> {
    if (Platform.OS !== 'android') {
      console.warn('Usage tracking only available on Android');
      return [];
    }

    try {
      const stats = await UsageModule.getUsageStats(startMillis, endMillis);
      return stats || [];
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return [];
    }
  }

  /**
   * Get usage for the last 24 hours
   */
  static async getDailyUsage(): Promise<UsageStats[]> {
    const endMillis = Date.now();
    const startMillis = endMillis - 24 * 60 * 60 * 1000; // 24 hours ago
    return this.getUsageStats(startMillis, endMillis);
  }

  /**
   * Get total minutes of usage across all apps
   */
  static getTotalMinutes(stats: UsageStats[]): number {
    return stats.reduce((total, stat) => total + stat.minutes, 0);
  }

  /**
   * Get usage for specific apps
   */
  static filterByPackages(
    stats: UsageStats[],
    packageNames: string[]
  ): UsageStats[] {
    return stats.filter(stat => packageNames.includes(stat.packageName));
  }

  /**
   * Mock usage data for testing (iOS or when permission not granted)
   */
  static getMockUsageData(): UsageStats[] {
    return [
      {
        packageName: 'com.example.app1',
        appName: 'Example App 1',
        minutes: 45,
      },
      {
        packageName: 'com.example.app2',
        appName: 'Example App 2',
        minutes: 30,
      },
    ];
  }
}

export default UsageService;