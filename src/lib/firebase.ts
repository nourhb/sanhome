
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// IMPORTANT: These values are read from environment variables.
// Ensure your .env file is correctly populated.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log the configuration being used for debugging
console.log("[Firebase Lib] Attempting to initialize Firebase with the following public configuration parts:");
console.log(`[Firebase Lib] Project ID: ${firebaseConfig.projectId}`);
console.log(`[Firebase Lib] Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`[Firebase Lib] Storage Bucket: ${firebaseConfig.storageBucket}`);
console.log(`[Firebase Lib] Messaging Sender ID: ${firebaseConfig.messagingSenderId}`);

if (!firebaseConfig.appId) {
  console.warn("[Firebase Lib CRITICAL WARNING] NEXT_PUBLIC_FIREBASE_APP_ID is MISSING or empty in your .env file. Firebase will likely fail to initialize correctly. Please add it from your Firebase project settings.");
} else {
  console.log(`[Firebase Lib] App ID: ${firebaseConfig.appId}`);
}

if (firebaseConfig.measurementId) {
  console.log(`[Firebase Lib] Measurement ID: ${firebaseConfig.measurementId}`);
} else {
  console.log("[Firebase Lib] Measurement ID: NOT SET (Analytics will not be initialized).");
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

// Critical check for essential config variables
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error("[Firebase Lib CRITICAL ERROR] Essential Firebase config values (apiKey, authDomain, projectId, appId) are missing or empty in your .env file. Firebase WILL FAIL to initialize. Please check your .env file and Firebase project settings.");
} else {
  // Initialize Firebase
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("[Firebase Lib] Firebase app initialized successfully.");
    } catch (e: any) {
      console.error("[Firebase Lib CRITICAL ERROR] Failed to initialize Firebase app:", e.message, e);
      app = null; 
    }
  } else {
    app = getApps()[0]!;
    console.log("[Firebase Lib] Firebase app already initialized.");
  }

  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("[Firebase Lib] Auth and Firestore services obtained from app.");

    // Initialize Analytics only on the client side and if measurementId is available
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      try {
        analytics = getAnalytics(app);
        console.log("[Firebase Lib] Firebase Analytics initialized.");
      } catch (e: any) {
        console.warn("[Firebase Lib] Failed to initialize Firebase Analytics:", e.message);
        analytics = null;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Lib] Development mode detected. Checking for emulators...');
      try {
        // Check if emulators are already connected to prevent errors on HMR
        // This is a bit of a hack, as the SDK doesn't provide a direct "isConnected" check easily accessible here.
        // We assume if `auth.emulatorConfig` is null, it's not connected yet.
        if (auth && !(auth as any).emulatorConfig) {
            connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
            console.log('[Firebase Lib] Auth emulator connection configured.');
        } else if (auth) {
            console.log('[Firebase Lib] Auth emulator seems already configured or connected.');
        }
        
        if (db && !(db as any)._settings.host.includes('localhost')) { // A way to check if not already connected to emulator
            connectFirestoreEmulator(db, 'localhost', 8080);
            console.log('[Firebase Lib] Firestore emulator connection configured.');
        } else if (db) {
            console.log('[Firebase Lib] Firestore emulator seems already configured or connected.');
        }
        console.log('[Firebase Lib] Attempted to configure emulators if not already connected.');
      } catch (error) {
        console.warn('[Firebase Lib] Warning configuring Firebase emulators (they might not be running, or already connected):', error);
      }
    } else {
      console.log('[Firebase Lib] Production mode detected. Connecting to live Firebase services.');
    }
  } else {
    console.error("[Firebase Lib CRITICAL ERROR] Firebase app object is null. Auth and Firestore services will NOT be available.");
  }
}

export { app, auth, db, analytics };
