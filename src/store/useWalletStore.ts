import { create } from 'zustand';
import type { Transaction, Investment } from '../types';

/**
 * Wallet store for token balance, transactions, and investments
 * Does not persist to AsyncStorage (data loaded from Firestore)
 */

interface WalletState {
  balance: number;
  transactions: Transaction[];
  investments: Investment[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBalance: (balance: number) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setInvestments: (investments: Investment[]) => void;
  addTransaction: (transaction: Transaction) => void;
  addInvestment: (investment: Investment) => void;
  updateBalance: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  transactions: [],
  investments: [],
  isLoading: false,
  error: null,

  /**
   * Set token balance
   * @param balance New balance amount
   */
  setBalance: (balance) => set({ balance }),

  /**
   * Set transaction history
   * @param transactions Array of transactions
   */
  setTransactions: (transactions) => set({ transactions }),

  /**
   * Set investments
   * @param investments Array of investments
   */
  setInvestments: (investments) => set({ investments }),

  /**
   * Add a new transaction to the list
   * Automatically updates balance from transaction
   * @param transaction Transaction to add
   */
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
      balance: transaction.balance,
    })),

  /**
   * Add a new investment to the list
   * @param investment Investment to add
   */
  addInvestment: (investment) =>
    set((state) => ({
      investments: [investment, ...state.investments],
    })),

  /**
   * Update balance by adding/subtracting amount
   * @param amount Amount to add (positive) or subtract (negative)
   */
  updateBalance: (amount) =>
    set((state) => ({
      balance: state.balance + amount,
    })),

  /**
   * Set loading state
   * @param loading Loading state
   */
  setLoading: (loading) => set({ isLoading: loading }),

  /**
   * Set error message
   * @param error Error message or null
   */
  setError: (error) => set({ error }),

  /**
   * Clear all wallet data
   * Used when user signs out
   */
  clearWallet: () =>
    set({
      balance: 0,
      transactions: [],
      investments: [],
      isLoading: false,
      error: null,
    }),
}));

export default useWalletStore;