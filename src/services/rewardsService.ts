import { firestoreInstance, firestoreHelpers } from '../api/firebase';
import { APP_CONFIG, FIRESTORE_COLLECTIONS } from '../config/constants';
import type { Transaction } from '../types';
import UsageService from './usageService';

/**
 * Rewards engine service
 * Calculates and awards tokens based on screen time
 * 
 * Key Features:
 * - Token calculation based on usage minutes
 * - Idempotent token awards (prevents duplicates)
 * - Transaction history management
 * - Window-based tracking to avoid double-awarding
 */

export class RewardsService {
  /**
   * Calculate tokens earned from minutes of usage
   * Formula: floor(minutes / 60) * TOKENS_PER_HOUR
   * 
   * @param totalMinutes Total minutes of tracked usage
   * @returns Number of tokens to award
   * 
   * @example
   * calculateTokens(120) // 2 hours -> returns 20 tokens (if TOKENS_PER_HOUR = 10)
   * calculateTokens(90)  // 1.5 hours -> returns 10 tokens (rounds down)
   * calculateTokens(45)  // 45 mins -> returns 0 tokens (less than 1 hour)
   */
  static calculateTokens(totalMinutes: number): number {
    const hours = Math.floor(totalMinutes / 60);
    return hours * APP_CONFIG.TOKENS_PER_HOUR;
  }

  /**
   * Generate a unique window ID for idempotency
   * Prevents awarding tokens twice for the same time window
   * 
   * @param uid User ID
   * @param startMillis Start of time window in milliseconds
   * @param endMillis End of time window in milliseconds
   * @returns Unique window identifier
   * 
   * @example
   * generateWindowId('user123', 1700000000000, 1700003600000)
   * // Returns: "user123_1700000000000_1700003600000"
   */
  static generateWindowId(uid: string, startMillis: number, endMillis: number): string {
    return `${uid}_${startMillis}_${endMillis}`;
  }

  /**
   * Check if a window has already been processed
   * Used to prevent duplicate token awards
   * 
   * @param windowId Unique window identifier
   * @returns True if window has been processed, false otherwise
   */
  static async isWindowProcessed(windowId: string): Promise<boolean> {
    try {
      const doc = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.PROCESSED_WINDOWS)
        .doc(windowId)
        .get();
      return doc.exists;
    } catch (error) {
      console.error('[RewardsService] Error checking window:', error);
      return false;
    }
  }

  /**
   * Mark a window as processed
   * Stores a document in Firestore to track that tokens have been awarded
   * 
   * @param windowId Unique window identifier
   * @throws Error if Firestore write fails
   */
  static async markWindowProcessed(windowId: string): Promise<void> {
    try {
      await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.PROCESSED_WINDOWS)
        .doc(windowId)
        .set({
          processedAt: firestoreInstance.FieldValue.serverTimestamp(),
        });
      console.log('[RewardsService] Marked window as processed:', windowId);
    } catch (error) {
      console.error('[RewardsService] Error marking window as processed:', error);
      throw error;
    }
  }

  /**
   * Award tokens for a time window
   * Main function for the rewards engine
   * 
   * Process:
   * 1. Check if window already processed (idempotency)
   * 2. Get usage stats from native module or use manual input
   * 3. Calculate tokens to award
   * 4. Use Firestore transaction to atomically:
   *    - Update user's token balance
   *    - Create transaction record
   * 5. Mark window as processed
   * 
   * @param uid User ID
   * @param startMillis Start of time window
   * @param endMillis End of time window
   * @param manualMinutes Optional manual input (for iOS or testing)
   * @returns Object with tokensAwarded and totalMinutes
   * 
   * @example
   * // Award tokens for last hour
   * const result = await RewardsService.awardTokensForWindow(
   *   'user123',
   *   Date.now() - 3600000,
   *   Date.now()
   * );
   * console.log(`Awarded ${result.tokensAwarded} tokens`);
   */
  static async awardTokensForWindow(
    uid: string,
    startMillis: number,
    endMillis: number,
    manualMinutes?: number
  ): Promise<{ tokensAwarded: number; totalMinutes: number }> {
    // Generate window ID for idempotency
    const windowId = this.generateWindowId(uid, startMillis, endMillis);

    // Check if already processed
    const alreadyProcessed = await this.isWindowProcessed(windowId);
    if (alreadyProcessed) {
      console.log('[RewardsService] Window already processed:', windowId);
      return { tokensAwarded: 0, totalMinutes: 0 };
    }

    try {
      // Get usage stats
      let totalMinutes: number;
      
      if (manualMinutes !== undefined) {
        // Use manual input (for iOS or testing)
        totalMinutes = manualMinutes;
        console.log('[RewardsService] Using manual minutes:', totalMinutes);
      } else {
        // Get usage from native module
        const stats = await UsageService.getUsageStats(startMillis, endMillis);
        totalMinutes = UsageService.getTotalMinutes(stats);
        console.log('[RewardsService] Calculated minutes from usage stats:', totalMinutes);
      }

      // Calculate tokens
      const tokensAwarded = this.calculateTokens(totalMinutes);

      if (tokensAwarded === 0) {
        console.log('[RewardsService] No tokens to award for this window');
        await this.markWindowProcessed(windowId);
        return { tokensAwarded: 0, totalMinutes };
      }

      console.log(`[RewardsService] Awarding ${tokensAwarded} tokens for ${totalMinutes} minutes`);

      // Award tokens using Firestore transaction for atomicity
      await firestoreHelpers.runTransaction(async transaction => {
        const userRef = firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentBalance = userData?.tokensBalance || 0;
        const newBalance = currentBalance + tokensAwarded;

        // Update user balance
        transaction.update(userRef, {
          tokensBalance: newBalance,
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
          type: APP_CONFIG.TRANSACTION_TYPES.REWARD as any,
          amount: tokensAwarded,
          balance: newBalance,
          timestamp: Date.now(),
          metadata: {
            minutes: totalMinutes,
            windowStart: startMillis,
            windowEnd: endMillis,
          },
        };

        transaction.set(transactionRef, transactionData);
      });

      // Mark window as processed after successful transaction
      await this.markWindowProcessed(windowId);

      console.log(`[RewardsService] Successfully awarded ${tokensAwarded} tokens`);
      return { tokensAwarded, totalMinutes };
    } catch (error) {
      console.error('[RewardsService] Error awarding tokens:', error);
      throw error;
    }
  }

  /**
   * Award tokens for the last 24 hours
   * Convenience method for daily token awards
   * 
   * @param uid User ID
   * @returns Object with tokensAwarded and totalMinutes
   * 
   * @example
   * // Award daily tokens
   * const result = await RewardsService.awardDailyTokens('user123');
   */
  static async awardDailyTokens(uid: string): Promise<{ tokensAwarded: number; totalMinutes: number }> {
    const endMillis = Date.now();
    const startMillis = endMillis - 24 * 60 * 60 * 1000; // 24 hours ago
    return this.awardTokensForWindow(uid, startMillis, endMillis);
  }

  /**
   * Award tokens for the last hour
   * Used by background fetch service
   * 
   * @param uid User ID
   * @returns Object with tokensAwarded and totalMinutes
   */
  static async awardHourlyTokens(uid: string): Promise<{ tokensAwarded: number; totalMinutes: number }> {
    const endMillis = Date.now();
    const startMillis = endMillis - 60 * 60 * 1000; // 1 hour ago
    return this.awardTokensForWindow(uid, startMillis, endMillis);
  }

  /**
   * Get user's transaction history
   * Retrieves recent transactions ordered by timestamp
   * 
   * @param uid User ID
   * @param limit Maximum number of transactions to return (default: 50)
   * @returns Array of transactions
   * 
   * @example
   * const transactions = await RewardsService.getTransactionHistory('user123', 10);
   * console.log(`User has ${transactions.length} recent transactions`);
   */
  static async getTransactionHistory(
    uid: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    try {
      const snapshot = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .collection(FIRESTORE_COLLECTIONS.TRANSACTIONS)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];

      console.log(`[RewardsService] Retrieved ${transactions.length} transactions for user ${uid}`);
      return transactions;
    } catch (error) {
      console.error('[RewardsService] Error fetching transaction history:', error);
      return [];
    }
  }

  /**
   * Get transactions by type
   * Filter transactions to show only specific types (e.g., rewards only)
   * 
   * @param uid User ID
   * @param type Transaction type ('reward', 'unlock', 'purchase', etc.)
   * @param limit Maximum number of transactions
   * @returns Array of filtered transactions
   */
  static async getTransactionsByType(
    uid: string,
    type: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    try {
      const snapshot = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .collection(FIRESTORE_COLLECTIONS.TRANSACTIONS)
        .where('type', '==', type)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
    } catch (error) {
      console.error('[RewardsService] Error fetching transactions by type:', error);
      return [];
    }
  }

  /**
   * Get total tokens earned (all time)
   * Calculates sum of all reward transactions
   * 
   * @param uid User ID
   * @returns Total tokens earned
   */
  static async getTotalTokensEarned(uid: string): Promise<number> {
    try {
      const rewardTransactions = await this.getTransactionsByType(uid, 'reward', 1000);
      const total = rewardTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      return total;
    } catch (error) {
      console.error('[RewardsService] Error calculating total tokens earned:', error);
      return 0;
    }
  }

  /**
   * Get earnings statistics for a date range
   * Useful for analytics and user insights
   * 
   * @param uid User ID
   * @param startMillis Start of period
   * @param endMillis End of period
   * @returns Stats object with tokens, minutes, and count
   */
  static async getEarningsStats(
    uid: string,
    startMillis: number,
    endMillis: number
  ): Promise<{ tokens: number; minutes: number; count: number }> {
    try {
      const snapshot = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .collection(FIRESTORE_COLLECTIONS.TRANSACTIONS)
        .where('type', '==', 'reward')
        .where('timestamp', '>=', startMillis)
        .where('timestamp', '<=', endMillis)
        .get();

      let totalTokens = 0;
      let totalMinutes = 0;
      let count = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalTokens += data.amount || 0;
        totalMinutes += data.metadata?.minutes || 0;
        count++;
      });

      return {
        tokens: totalTokens,
        minutes: totalMinutes,
        count,
      };
    } catch (error) {
      console.error('[RewardsService] Error getting earnings stats:', error);
      return { tokens: 0, minutes: 0, count: 0 };
    }
  }

  /**
   * Clean up old processed windows (housekeeping)
   * Remove processed window records older than 30 days
   * Should be run periodically to prevent collection bloat
   * 
   * @param uid User ID
   */
  static async cleanupOldWindows(uid: string): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      
      // Query old windows
      const snapshot = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.PROCESSED_WINDOWS)
        .where('processedAt', '<', new Date(thirtyDaysAgo))
        .limit(500) // Batch limit
        .get();

      // Delete in batch
      const batch = firestoreInstance.batch();
      snapshot.docs.forEach(doc => {
        if (doc.id.startsWith(uid)) {
          batch.delete(doc.ref);
        }
      });

      await batch.commit();
      console.log(`[RewardsService] Cleaned up ${snapshot.size} old windows for user ${uid}`);
    } catch (error) {
      console.error('[RewardsService] Error cleaning up old windows:', error);
    }
  }
}

export default RewardsService;