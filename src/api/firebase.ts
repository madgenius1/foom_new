import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

/**
 * Firebase configuration and initialization
 * Reads configuration from environment variables
 */

// Firebase config is automatically loaded from google-services.json on Android
// For iOS, you would need to configure GoogleService-Info.plist
// The environment variables are provided for reference/documentation

export const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Export Firebase instances
export const authInstance = auth();
export const firestoreInstance = firestore();

// Helper to check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  try {
    return !!FIREBASE_PROJECT_ID && FIREBASE_PROJECT_ID !== 'your_project_id';
  } catch {
    return false;
  }
};

/**
 * Firestore helper functions with error handling
 */

export const firestoreHelpers = {
  /**
   * Get a user document
   */
  getUser: async (uid: string) => {
    try {
      const doc = await firestoreInstance.collection('users').doc(uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  /**
   * Create or update user document
   */
  setUser: async (uid: string, data: any) => {
    try {
      await firestoreInstance.collection('users').doc(uid).set(
        {
          ...data,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error setting user:', error);
      throw error;
    }
  },

  /**
   * Run a Firestore transaction
   */
  runTransaction: async <T>(updateFunction: (transaction: FirebaseFirestoreTypes.Transaction) => Promise<T>) => {
    try {
      return await firestoreInstance.runTransaction(updateFunction);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  },

  /**
   * Add a document to a collection
   */
  addDocument: async (collection: string, data: any) => {
    try {
      const ref = await firestoreInstance.collection(collection).add({
        ...data,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error(`Error adding document to ${collection}:`, error);
      throw error;
    }
  },

  /**
   * Query documents
   */
  queryDocuments: async (collection: string, queryFn?: (ref: any) => any) => {
    try {
      let query = firestoreInstance.collection(collection);
      if (queryFn) {
        query = queryFn(query);
      }
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error querying ${collection}:`, error);
      throw error;
    }
  },
};