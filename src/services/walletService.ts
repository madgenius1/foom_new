/**
 * walletService.ts
 * Wallet service for token purchases, investments, and withdrawals
 * 
 * Features:
 * - Mock M-Pesa STK Push simulation
 * - Purchase tokens with simulated payment
 * - Invest tokens in Money Market Funds (MMFs)
 * - Withdraw tokens to M-Pesa (simulated)
 * - Get user investments and calculate totals
 * - Atomic Firestore transactions for all operations
 * 
 * Dependencies:
 * - Firebase Firestore
 * - App configuration constants
 * 
 * Note: M-Pesa integration is MOCKED for MVP
 * For production, replace simulateStkPush with real Daraja API calls
 */

import { firestoreInstance, firestoreHelpers } from '../api/firebase';
import { APP_CONFIG, FIRESTORE_COLLECTIONS } from '../config/constants';
import type { Transaction, Investment } from '../types';

/**
 * Wallet service for token purchases, investments, and withdrawals
 */
export class WalletService {
  /**
   * Simulate M-Pesa STK Push (mock implementation)
   * In production, this would call Safaricom Daraja API
   * 
   * @param phoneNumber M-Pesa phone number (format: 254XXXXXXXXX)
   * @param amount Amount in KES
   * @returns Promise with success status, transaction ID, and message
   * 
   * @example
   * const result = await WalletService.simulateStkPush('254712345678', 100);
   * if (result.success) {
   *   console.log('Transaction ID:', result.transactionId);
   * }
   */
  static async simulateStkPush(
    phoneNumber: string,
    amount: number
  ): Promise<{ success: boolean; transactionId: string; message: string }> {
    // Simulate API delay (STK Push typically takes 1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate random success/failure for testing
    // 90% success rate in development
    const success = Math.random() > 0.1;

    if (success) {
      // Generate mock transaction ID (similar to real M-Pesa format)
      const transactionId = `MPX${Date.now()}${Math.floor(Math.random() * 1000)}`;
      return {
        success: true,
        transactionId,
        message: 'Payment successful',
      };
    } else {
      return {
        success: false,
        transactionId: '',
        message: 'Payment failed. Please try again.',
      };
    }
  }

  /**
   * Purchase tokens (mock M-Pesa payment)
   * Simulates STK Push and adds tokens to user balance
   * 
   * @param uid User ID
   * @param tokenAmount Number of tokens to purchase
   * @param phoneNumber M-Pesa phone number
   * @returns Object with success status, message, and new balance
   * 
   * @example
   * const result = await WalletService.purchaseTokens(
   *   'user123',
   *   100,
   *   '254712345678'
   * );
   * if (result.success) {
   *   console.log('New balance:', result.newBalance);
   * }
   */
  static async purchaseTokens(
    uid: string,
    tokenAmount: number,
    phoneNumber: string
  ): Promise<{ success: boolean; message: string; newBalance: number }> {
    try {
      // For MVP, 1 token = 1 KES (adjust conversion rate as needed)
      const amount = tokenAmount;

      // Validate inputs
      if (!phoneNumber || phoneNumber.length < 10) {
        return {
          success: false,
          message: 'Invalid phone number',
          newBalance: 0,
        };
      }

      if (tokenAmount <= 0) {
        return {
          success: false,
          message: 'Amount must be greater than 0',
          newBalance: 0,
        };
      }

      // Simulate STK Push
      const paymentResult = await this.simulateStkPush(phoneNumber, amount);

      if (!paymentResult.success) {
        return {
          success: false,
          message: paymentResult.message,
          newBalance: 0,
        };
      }

      // Add tokens using Firestore transaction (atomic operation)
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
        const newBalance = currentBalance + tokenAmount;

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
          type: APP_CONFIG.TRANSACTION_TYPES.PURCHASE as any,
          amount: tokenAmount,
          balance: newBalance,
          timestamp: Date.now(),
          metadata: {
            phoneNumber,
          },
        };

        transaction.set(transactionRef, transactionData);

        return newBalance;
      });

      return {
        success: true,
        message: `Successfully purchased ${tokenAmount} tokens`,
        newBalance: result,
      };
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      return {
        success: false,
        message: 'Failed to purchase tokens. Please try again.',
        newBalance: 0,
      };
    }
  }

  /**
   * Invest tokens in an MMF
   * Can use existing token balance OR purchase tokens via M-Pesa
   * 
   * @param uid User ID
   * @param mmfId MMF ID (from Firestore mmfs collection)
   * @param mmfName MMF display name
   * @param tokenAmount Number of tokens to invest
   * @param unitPrice Current unit price of the MMF
   * @param phoneNumber Optional phone number for M-Pesa payment (if not using token balance)
   * @returns Object with success status, message, and optional investment ID
   * 
   * @example
   * // Invest using token balance
   * const result = await WalletService.investInMMF(
   *   'user123',
   *   'cic_mmf',
   *   'CIC Money Market Fund',
   *   100,
   *   100
   * );
   * 
   * // Invest by purchasing tokens
   * const result = await WalletService.investInMMF(
   *   'user123',
   *   'cic_mmf',
   *   'CIC Money Market Fund',
   *   100,
   *   100,
   *   '254712345678'
   * );
   */
  static async investInMMF(
    uid: string,
    mmfId: string,
    mmfName: string,
    tokenAmount: number,
    unitPrice: number,
    phoneNumber?: string
  ): Promise<{ success: boolean; message: string; investmentId?: string }> {
    try {
      // Validate inputs
      if (tokenAmount <= 0) {
        return {
          success: false,
          message: 'Investment amount must be greater than 0',
        };
      }

      if (unitPrice <= 0) {
        return {
          success: false,
          message: 'Invalid unit price',
        };
      }

      // Calculate units
      const units = tokenAmount / unitPrice;

      // For MVP, simulate payment if phone number is provided
      if (phoneNumber) {
        const paymentResult = await this.simulateStkPush(phoneNumber, tokenAmount);
        if (!paymentResult.success) {
          return {
            success: false,
            message: paymentResult.message,
          };
        }
      }

      // Create investment using Firestore transaction
      const investmentId = await firestoreHelpers.runTransaction(async transaction => {
        const userRef = firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentBalance = userData?.tokensBalance || 0;

        // If using token balance (no phone number), check sufficient balance
        if (!phoneNumber && currentBalance < tokenAmount) {
          throw new Error('Insufficient token balance');
        }

        const newBalance = phoneNumber ? currentBalance : currentBalance - tokenAmount;

        // Update user balance and MMF preference
        transaction.update(userRef, {
          tokensBalance: newBalance,
          mmfPreference: mmfId,
          updatedAt: firestoreInstance.FieldValue.serverTimestamp(),
        });

        // Create investment record
        const investmentRef = firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid)
          .collection('investments')
          .doc();

        const investmentData: Partial<Investment> = {
          uid,
          mmfId,
          mmfName,
          amount: tokenAmount,
          units,
          timestamp: Date.now(),
        };

        transaction.set(investmentRef, investmentData);

        // Create transaction record
        const transactionRef = firestoreInstance
          .collection(FIRESTORE_COLLECTIONS.USERS)
          .doc(uid)
          .collection(FIRESTORE_COLLECTIONS.TRANSACTIONS)
          .doc();

        const transactionData: Partial<Transaction> = {
          uid,
          type: APP_CONFIG.TRANSACTION_TYPES.INVESTMENT as any,
          amount: phoneNumber ? tokenAmount : -tokenAmount,
          balance: newBalance,
          timestamp: Date.now(),
          metadata: {
            mmfId,
            mmfName,
            phoneNumber,
          },
        };

        transaction.set(transactionRef, transactionData);

        return investmentRef.id;
      });

      return {
        success: true,
        message: `Successfully invested ${tokenAmount} tokens in ${mmfName}`,
        investmentId,
      };
    } catch (error) {
      console.error('Error investing in MMF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to invest: ${errorMessage}`,
      };
    }
  }

  /**
   * Withdraw tokens from investment to M-Pesa
   * Simulates B2C payment (Business to Customer)
   * 
   * @param uid User ID
   * @param amount Amount to withdraw (in tokens)
   * @param phoneNumber M-Pesa phone number to receive funds
   * @returns Object with success status, message, and new balance
   * 
   * @example
   * const result = await WalletService.withdrawTokens(
   *   'user123',
   *   50,
   *   '254712345678'
   * );
   */
  static async withdrawTokens(
    uid: string,
    amount: number,
    phoneNumber: string
  ): Promise<{ success: boolean; message: string; newBalance: number }> {
    try {
      // Validate inputs
      if (amount <= 0) {
        return {
          success: false,
          message: 'Withdrawal amount must be greater than 0',
          newBalance: 0,
        };
      }

      if (!phoneNumber || phoneNumber.length < 10) {
        return {
          success: false,
          message: 'Invalid phone number',
          newBalance: 0,
        };
      }

      // Simulate withdrawal processing (B2C payment typically takes 2-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Deduct tokens using Firestore transaction
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

        if (currentBalance < amount) {
          throw new Error('Insufficient balance');
        }

        const newBalance = currentBalance - amount;

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
          type: APP_CONFIG.TRANSACTION_TYPES.WITHDRAWAL as any,
          amount: -amount,
          balance: newBalance,
          timestamp: Date.now(),
          metadata: {
            phoneNumber,
          },
        };

        transaction.set(transactionRef, transactionData);

        return newBalance;
      });

      return {
        success: true,
        message: `Successfully withdrew ${amount} tokens to ${phoneNumber}`,
        newBalance: result,
      };
    } catch (error) {
      console.error('Error withdrawing tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Withdrawal failed: ${errorMessage}`,
        newBalance: 0,
      };
    }
  }

  /**
   * Get user's investments
   * Returns all investments ordered by most recent first
   * 
   * @param uid User ID
   * @returns Array of investment objects
   */
  static async getUserInvestments(uid: string): Promise<Investment[]> {
    try {
      const snapshot = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .collection('investments')
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Investment[];
    } catch (error) {
      console.error('Error fetching investments:', error);
      return [];
    }
  }

  /**
   * Get total invested amount across all MMFs
   * 
   * @param uid User ID
   * @returns Total amount invested (sum of all investments)
   */
  static async getTotalInvested(uid: string): Promise<number> {
    const investments = await this.getUserInvestments(uid);
    return investments.reduce((total, inv) => total + inv.amount, 0);
  }

  /**
   * Get investments for a specific MMF
   * 
   * @param uid User ID
   * @param mmfId MMF ID to filter by
   * @returns Array of investments in the specified MMF
   */
  static async getInvestmentsByMMF(uid: string, mmfId: string): Promise<Investment[]> {
    try {
      const snapshot = await firestoreInstance
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(uid)
        .collection('investments')
        .where('mmfId', '==', mmfId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Investment[];
    } catch (error) {
      console.error('Error fetching MMF investments:', error);
      return [];
    }
  }

  /**
   * Calculate total units owned in a specific MMF
   * 
   * @param uid User ID
   * @param mmfId MMF ID
   * @returns Total units owned
   */
  static async getTotalUnitsByMMF(uid: string, mmfId: string): Promise<number> {
    const investments = await this.getInvestmentsByMMF(uid, mmfId);
    return investments.reduce((total, inv) => total + inv.units, 0);
  }

  /**
   * Get investment summary statistics
   * 
   * @param uid User ID
   * @returns Object with investment statistics
   */
  static async getInvestmentSummary(uid: string): Promise<{
    totalInvested: number;
    totalInvestments: number;
    uniqueMMFs: number;
    averageInvestment: number;
  }> {
    const investments = await this.getUserInvestments(uid);
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const uniqueMMFs = new Set(investments.map(inv => inv.mmfId)).size;
    const averageInvestment = investments.length > 0 ? totalInvested / investments.length : 0;

    return {
      totalInvested,
      totalInvestments: investments.length,
      uniqueMMFs,
      averageInvestment,
    };
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   * 
   * @param phoneNumber Raw phone number (can be 07XX, +254, 254, etc.)
   * @returns Formatted phone number
   * 
   * @example
   * WalletService.formatPhoneNumber('0712345678') // Returns '254712345678'
   * WalletService.formatPhoneNumber('+254712345678') // Returns '254712345678'
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove spaces, dashes, and other non-numeric characters
    let cleaned = phoneNumber.replace(/[^0-9]/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      // 0712345678 -> 254712345678
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
      cleaned = cleaned;
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      // 712345678 -> 254712345678
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate M-Pesa phone number
   * 
   * @param phoneNumber Phone number to validate
   * @returns True if valid Kenyan phone number
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Kenyan numbers: 254 + 9 digits (starting with 7 or 1)
    const regex = /^254[71]\d{8}$/;
    return regex.test(formatted);
  }
}

export default WalletService;