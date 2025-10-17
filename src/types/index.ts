/**
 * Type definitions for the FOOM app
 */

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  tokensBalance: number;
  lockedApps: string[];
  mmfPreference?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MMF {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  ratePercent: number;
  minInvestment: number;
  logo?: string;
}

export interface Transaction {
  id: string;
  uid: string;
  type: 'reward' | 'unlock' | 'purchase' | 'investment' | 'withdrawal';
  amount: number;
  balance: number;
  timestamp: number;
  metadata?: {
    appPackage?: string;
    appName?: string;
    minutes?: number;
    mmfId?: string;
    mmfName?: string;
    phoneNumber?: string;
    windowStart?: number;
    windowEnd?: number;
  };
}

export interface UsageStats {
  packageName: string;
  appName: string;
  minutes: number;
  lastUsed?: number;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
  icon?: string;
  isLocked: boolean;
}

export interface UnlockSession {
  packageName: string;
  unlockedAt: number;
  expiresAt: number;
}

export interface Investment {
  id: string;
  uid: string;
  mmfId: string;
  mmfName: string;
  amount: number;
  units: number;
  timestamp: number;
  currentValue?: number;
}

export interface ThemePreference {
  mode: 'light' | 'dark' | 'auto';
}