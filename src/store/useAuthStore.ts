import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authInstance, firestoreHelpers } from '../api/firebase';
import type { User } from '../types';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '@env';

/**
 * Authentication store using Zustand
 * Manages user authentication state, login, signup, and user data
 */

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loadUser: (uid: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      /**
       * Sign up with email and password
       * Creates Firebase auth user and Firestore user document
       */
      signUp: async (email, password, name, phone) => {
        set({ isLoading: true, error: null });
        try {
          // Create Firebase user
          const userCredential = await authInstance.createUserWithEmailAndPassword(
            email,
            password
          );

          const uid = userCredential.user.uid;

          // Create Firestore user document
          const userData: Omit<User, 'uid'> = {
            name,
            email,
            phone: phone || '',
            tokensBalance: 0,
            lockedApps: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await firestoreHelpers.setUser(uid, userData);

          // Load user data
          await get().loadUser(uid);

          set({ isLoading: false, isAuthenticated: true });
        } catch (error: any) {
          console.error('Sign up error:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to sign up',
          });
          throw error;
        }
      },

      /**
       * Sign in with email and password
       */
      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const userCredential = await authInstance.signInWithEmailAndPassword(
            email,
            password
          );

          await get().loadUser(userCredential.user.uid);

          set({ isLoading: false, isAuthenticated: true });
        } catch (error: any) {
          console.error('Sign in error:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to sign in',
          });
          throw error;
        }
      },

      /**
       * Sign in with Google
       * Uses Google Sign-In SDK and creates/updates Firestore user
       */
      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          await GoogleSignin.hasPlayServices();
          const userInfo = await GoogleSignin.signIn();

          const googleCredential = authInstance.GoogleAuthProvider.credential(
            userInfo.idToken
          );

          const userCredential = await authInstance.signInWithCredential(
            googleCredential
          );

          const uid = userCredential.user.uid;

          // Check if user document exists
          const existingUser = await firestoreHelpers.getUser(uid);

          if (!existingUser) {
            // Create new user document
            const userData: Omit<User, 'uid'> = {
              name: userInfo.user.name || 'User',
              email: userInfo.user.email,
              phone: '',
              tokensBalance: 0,
              lockedApps: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            await firestoreHelpers.setUser(uid, userData);
          }

          await get().loadUser(uid);

          set({ isLoading: false, isAuthenticated: true });
        } catch (error: any) {
          console.error('Google sign in error:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to sign in with Google',
          });
          throw error;
        }
      },

      /**
       * Sign out current user
       * Clears both Firebase auth and Google Sign-In session
       */
      signOut: async () => {
        set({ isLoading: true });
        try {
          await authInstance.signOut();
          
          // Sign out from Google if signed in
          const isSignedIn = await GoogleSignin.isSignedIn();
          if (isSignedIn) {
            await GoogleSignin.signOut();
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Sign out error:', error);
          set({ isLoading: false, error: error.message || 'Failed to sign out' });
        }
      },

      /**
       * Load user data from Firestore
       * Called after authentication to populate user state
       */
      loadUser: async (uid) => {
        try {
          const userData = await firestoreHelpers.getUser(uid);
          if (userData) {
            set({ user: { uid, ...userData } as User });
          }
        } catch (error) {
          console.error('Load user error:', error);
        }
      },

      /**
       * Update user data in Firestore
       * Merges updates with existing user document
       */
      updateUser: async (updates) => {
        const { user } = get();
        if (!user) return;

        try {
          await firestoreHelpers.setUser(user.uid, updates);
          set({ user: { ...user, ...updates } });
        } catch (error) {
          console.error('Update user error:', error);
          throw error;
        }
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;