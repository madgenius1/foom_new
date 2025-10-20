
export const APP_CONFIG = {
  // Token rewards configuration
  TOKENS_PER_HOUR: parseInt(process.env.TOKENS_PER_HOUR || '10', 10),
  
  // Unlock configuration
  UNLOCK_COST_TOKENS: parseInt(process.env.UNLOCK_COST_TOKENS || '20', 10),
  UNLOCK_DURATION_MINUTES: parseInt(process.env.UNLOCK_DURATION_MINUTES || '60', 10),
  
  // Background fetch configuration
  BACKGROUND_FETCH_INTERVAL: 15, // minutes
  
  // Usage tracking configuration
  USAGE_TRACKING_WINDOW_HOURS: 24,
  
  // Transaction types
  TRANSACTION_TYPES: {
    REWARD: 'reward',
    UNLOCK: 'unlock',
    PURCHASE: 'purchase',
    INVESTMENT: 'investment',
    WITHDRAWAL: 'withdrawal',
  },
  
  APP_NAME: 'FOOM',
  APP_PACKAGE: 'com.foom',
  
  MPESA: {
    CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || 'placeholder_key',
    CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || 'placeholder_secret',
    PASSKEY: process.env.MPESA_PASSKEY || 'placeholder_passkey',
    SHORTCODE: process.env.MPESA_SHORTCODE || '174379',
  },
};

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  MMFS: 'mmfs',
  TRANSACTIONS: 'transactions',
  PROCESSED_WINDOWS: 'processedWindows',
};

export const ASYNC_STORAGE_KEYS = {
  THEME: '@foom:theme',
  ONBOARDING_COMPLETED: '@foom:onboarding_completed',
  LOCKED_APPS: '@foom:locked_apps',
  AUTH_TOKEN: '@foom:auth_token',
};