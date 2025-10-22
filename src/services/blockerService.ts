
import { NativeModules, Platform } from 'react-native';
import { firestoreInstance, firestoreHelpers } from '../api/firebase';
import { APP_CONFIG, FIRESTORE_COLLECTIONS } from '../config/contsants';
import type { Transaction, UnlockSession } from '../types';

const { BlockerModule } = NativeModules;

/**
 * Service for app blocking and unlocking functionality
 */
export class BlockerService {
  /**
   * Update the list of locked apps in the native module
   * This syncs the locked apps list to the Android AccessibilityService
   * 
   * @param packageNames Array of package names to lock (e.g., ['com.instagram.android'])
   */
  static async updateLockedApps(packageNames: string[]): Promise<void> {
    if (Platform.OS !== 'android') {
      console.warn('App blocking only available on Android');
      return;
    }

    try {
      await BlockerModule.updateLockedApps(packageNames);
      console.log('Updated locked apps:', packageNames);
    } catch (error) {
      console.error('Error updating locked apps:', error);
      throw error;
    }
  }

  /**
   * Check if an app is currently blocked
   * 
   * @param packageName Package name to check (e.g., 'com.facebook.katana')
   * @returns True if app is blocked, false otherwise
   */
  static async isAppBlocked(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const blocked = await BlockerModule.checkBlockStatus(packageName);
      return blocked;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }

  /**
   * Request accessibility service permission
   * Opens Android accessibility settings
   * 
   * @returns True if settings opened successfully
   */
  static async requestAccessibilityPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      await BlockerModule.openAccessibilitySettings();
      return true;
    } catch (error) {
      console.error('Error opening accessibility settings:', error);
      return false;
    }
  }

  /**
   * Check if accessibility service is enabled
   * 
   * @returns True if accessibility service is running
   */
  static async hasAccessibilityPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const enabled = await BlockerModule.isAccessibilityEnabled();
      return enabled;
    } catch (error) {
      console.error('Error checking accessibility permission:', error);
      return false;
    }
  }

  /**
   * Unlock an app by deducting tokens from user's balance
   * Uses Firestore transaction to ensure atomic operation (no double-spend)
   * 
   * @param uid User ID
   * @param packageName Package name to unlock (e.g., 'com.twitter.android')
   * @param appName Display name of the app (e.g., 'Twitter')
   * @returns Object containing success status, new balance, and message
   * 
   * @example
   * const result = await BlockerService.unlockApp(
   *   'user123',
   *   'com.instagram.android',
   *   'Instagram'
   * );
   * if (result.success) {
   *   console.log(`New balance: ${result.newBalance}`);
   * }
   */
  static async unlockApp(
    uid: string,
    packageName: string,
    appName: string
  ): Promise<{ success: boolean; newBalance: number; message: string }> {
    const unlockCost = APP_CONFIG.UNLOCK_COST_TOKENS;
    const unlockDurationMs = APP_CONFIG.UNLOCK_DURATION_MINUTES * 60 * 1000;

    try {
      // Use Firestore transaction to ensure atomic operation
      const result = await firestoreHelpers.runTransaction(async transaction => {
        const userRef = firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentBalance = userData?.tokensBalance || 0;

        // Check if user has enough tokens
        if (currentBalance < unlockCost) {
          return {
            success: false,
            newBalance: currentBalance,
            message: `Insufficient tokens. You need ${unlockCost} tokens but have ${currentBalance}.`,
          };
        }

        const newBalance = currentBalance - unlockCost;
        const now = Date.now();
        const expiresAt = now + unlockDurationMs;

        // Get current locked apps and unlock sessions
        const lockedApps: string[] = userData?.lockedApps || [];
        const unlockSessions: UnlockSession[] = userData?.unlockSessions || [];

        // Remove app from locked list temporarily (will be re-added when session expires)
        const updatedLockedApps = lockedApps.filter(pkg => pkg !== packageName);

        // Add unlock session
        const newSession: UnlockSession = {
          packageName,
          unlockedAt: now,
          expiresAt,
        };

        // Remove expired sessions and add new one
        const activeSessions = unlockSessions.filter(s => s.expiresAt > now);
        activeSessions.push(newSession);

        // Update user document
        transaction.update(userRef, {
          tokensBalance: newBalance,
          lockedApps: updatedLockedApps,
          unlockSessions: activeSessions,
          updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
        });

        // Create transaction record
        const transactionRef = firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid)
          .collection(FIRESTORE_COLLECTIONS.TRANSACTIONS)
          .doc();

        const transactionData: Partial<Transaction> = {
          uid,
          type: APP_CONFIG.TRANSACTION_TYPES.UNLOCK as any,
          amount: -unlockCost,
          balance: newBalance,
          timestamp: now,
          metadata: {
            appPackage: packageName,
            appName,
          },
        };

        transaction.set(transactionRef, transactionData);

        return {
          success: true,
          newBalance,
          message: `${appName} unlocked for ${APP_CONFIG.UNLOCK_DURATION_MINUTES} minutes!`,
        };
      });

      // Update native module with new locked apps list
      if (result.success) {
        const userDoc = await firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid)
          .get();
        const lockedApps = userDoc.data()?.lockedApps || [];
        await this.updateLockedApps(lockedApps);
      }

      return result;
    } catch (error) {
      console.error('Error unlocking app:', error);
      return {
        success: false,
        newBalance: 0,
        message: 'Failed to unlock app. Please try again.',
      };
    }
  }

  /**
   * Re-lock expired unlock sessions
   * Should be called periodically (e.g., on app launch or via background task)
   * to restore locked apps after unlock sessions expire
   * 
   * @param uid User ID
   * 
   * @example
   * // Call on dashboard mount or app resume
   * useEffect(() => {
   *   if (user) {
   *     BlockerService.relockExpiredSessions(user.uid);
   *   }
   * }, [user]);
   */
  static async relockExpiredSessions(uid: string): Promise<void> {
    try {
      const userRef = firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return;
      }

      const userData = userDoc.data();
      const unlockSessions: UnlockSession[] = userData?.unlockSessions || [];
      const lockedApps: string[] = userData?.lockedApps || [];
      const now = Date.now();

      // Find expired sessions
      const expiredSessions = unlockSessions.filter(s => s.expiresAt <= now);
      const activeSessions = unlockSessions.filter(s => s.expiresAt > now);

      if (expiredSessions.length === 0) {
        return;
      }

      // Get packages from expired sessions
      const expiredPackages = expiredSessions.map(s => s.packageName);

      // Re-add to locked apps (avoid duplicates)
      const updatedLockedApps = Array.from(
        new Set([...lockedApps, ...expiredPackages])
      );

      // Update Firestore
      await userRef.update({
        lockedApps: updatedLockedApps,
        unlockSessions: activeSessions,
        updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
      });

      // Update native module
      await this.updateLockedApps(updatedLockedApps);

      console.log('Re-locked expired sessions:', expiredPackages);
    } catch (error) {
      console.error('Error re-locking expired sessions:', error);
    }
  }

  /**
   * Lock an app (add to locked list)
   * Adds a package name to the user's locked apps list
   * 
   * @param uid User ID
   * @param packageName Package name to lock
   * 
   * @example
   * await BlockerService.lockApp('user123', 'com.facebook.katana');
   */
  static async lockApp(uid: string, packageName: string): Promise<void> {
    try {
      const userRef = firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid);
      
      await firestoreInstance.runTransaction(async transaction => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const lockedApps: string[] = userData?.lockedApps || [];

        // Only add if not already locked
        if (!lockedApps.includes(packageName)) {
          lockedApps.push(packageName);
          transaction.update(userRef, {
            lockedApps,
            updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
          });
        }
      });

      // Update native module
      const userDoc = await userRef.get();
      const lockedApps = userDoc.data()?.lockedApps || [];
      await this.updateLockedApps(lockedApps);
    } catch (error) {
      console.error('Error locking app:', error);
      throw error;
    }
  }

  /**
   * Unlock an app permanently (remove from locked list)
   * Removes a package name from the user's locked apps list
   * This is different from temporary unlock - the app won't be locked again
   * 
   * @param uid User ID
   * @param packageName Package name to unlock permanently
   * 
   * @example
   * await BlockerService.unlockAppPermanently('user123', 'com.whatsapp');
   */
  static async unlockAppPermanently(uid: string, packageName: string): Promise<void> {
    try {
      const userRef = firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid);
      
      await firestoreInstance.runTransaction(async transaction => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const lockedApps: string[] = userData?.lockedApps || [];
        const updatedLockedApps = lockedApps.filter(pkg => pkg !== packageName);

        transaction.update(userRef, {
          lockedApps: updatedLockedApps,
          updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
        });
      });

      // Update native module
      const userDoc = await userRef.get();
      const lockedApps = userDoc.data()?.lockedApps || [];
      await this.updateLockedApps(lockedApps);
    } catch (error) {
      console.error('Error unlocking app permanently:', error);
      throw error;
    }
  }

  /**
   * Get all currently locked apps for a user
   * 
   * @param uid User ID
   * @returns Array of package names that are locked
   */
  static async getLockedApps(uid: string): Promise<string[]> {
    try {
      const userDoc = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .get();

      if (!userDoc.exists) {
        return [];
      }

      return userDoc.data()?.lockedApps || [];
    } catch (error) {
      console.error('Error getting locked apps:', error);
      return [];
    }
  }

  /**
   * Get active unlock sessions for a user
   * Returns sessions that haven't expired yet
   * 
   * @param uid User ID
   * @returns Array of active unlock sessions
   */
  static async getActiveUnlockSessions(uid: string): Promise<UnlockSession[]> {
    try {
      const userDoc = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .get();

      if (!userDoc.exists) {
        return [];
      }

      const allSessions: UnlockSession[] = userDoc.data()?.unlockSessions || [];
      const now = Date.now();

      // Filter to only active sessions
      return allSessions.filter(session => session.expiresAt > now);
    } catch (error) {
      console.error('Error getting unlock sessions:', error);
      return [];
    }
  }

  /**
   * Check if a specific app is currently unlocked (has active session)
   * 
   * @param uid User ID
   * @param packageName Package name to check
   * @returns True if app has active unlock session
   */
  static async isAppUnlocked(uid: string, packageName: string): Promise<boolean> {
    const activeSessions = await this.getActiveUnlockSessions(uid);
    return activeSessions.some(session => session.packageName === packageName);
  }

  /**
   * Get time remaining for an unlock session (in milliseconds)
   * 
   * @param uid User ID
   * @param packageName Package name
   * @returns Milliseconds remaining, or 0 if not unlocked
   */
  static async getUnlockTimeRemaining(uid: string, packageName: string): Promise<number> {
    const activeSessions = await this.getActiveUnlockSessions(uid);
    const session = activeSessions.find(s => s.packageName === packageName);
    
    if (!session) {
      return 0;
    }

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Bulk lock multiple apps at once
   * 
   * @param uid User ID
   * @param packageNames Array of package names to lock
   */
  static async lockMultipleApps(uid: string, packageNames: string[]): Promise<void> {
    try {
      const userRef = firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid);
      
      await firestoreInstance.runTransaction(async transaction => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const existingLockedApps: string[] = userData?.lockedApps || [];

        // Merge with existing, removing duplicates
        const updatedLockedApps = Array.from(
          new Set([...existingLockedApps, ...packageNames])
        );

        transaction.update(userRef, {
          lockedApps: updatedLockedApps,
          updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
        });
      });

      // Update native module
      const userDoc = await userRef.get();
      const lockedApps = userDoc.data()?.lockedApps || [];
      await this.updateLockedApps(lockedApps);
    } catch (error) {
      console.error('Error locking multiple apps:', error);
      throw error;
    }
  }

  /**
   * Bulk unlock multiple apps permanently
   * 
   * @param uid User ID
   * @param packageNames Array of package names to unlock
   */
  static async unlockMultipleAppsPermanently(
    uid: string,
    packageNames: string[]
  ): Promise<void> {
    try {
      const userRef = firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid);
      
      await firestoreInstance.runTransaction(async transaction => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const lockedApps: string[] = userData?.lockedApps || [];
        
        // Remove all specified packages
        const updatedLockedApps = lockedApps.filter(
          pkg => !packageNames.includes(pkg)
        );

        transaction.update(userRef, {
          lockedApps: updatedLockedApps,
          updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
        });
      });

      // Update native module
      const userDoc = await userRef.get();
      const lockedApps = userDoc.data()?.lockedApps || [];
      await this.updateLockedApps(lockedApps);
    } catch (error) {
      console.error('Error unlocking multiple apps:', error);
      throw error;
    }
  }
}

export default BlockerService;