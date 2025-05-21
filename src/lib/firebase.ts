
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
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Now included
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Now included
};

// Log the configuration being used for debugging
console.log("[Firebase Lib] Attempting to initialize Firebase with the following configuration:");
console.log(`[Firebase Lib] Project ID: ${firebaseConfig.projectId}`);
console.log(`[Firebase Lib] Auth Domain: ${firebaseConfig.authDomain}`);

if (!firebaseConfig.appId) {
  console.warn("[Firebase Lib CRITICAL WARNING] NEXT_PUBLIC_FIREBASE_APP_ID is MISSING in your .env file. Firebase will likely fail to initialize correctly. Please add it from your Firebase project settings.");
} else {
  console.log(`[Firebase Lib] App ID: ${firebaseConfig.appId}`);
}
if (firebaseConfig.measurementId) {
  console.log(`[Firebase Lib] Measurement ID: ${firebaseConfig.measurementId}`);
} else {
  console.log("[Firebase Lib] Measurement ID: NOT SET (optional for basic Firebase, required for Analytics).");
}


if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain || !firebaseConfig.appId) {
  console.error("[Firebase Lib CRITICAL ERROR] One or more core Firebase config values (apiKey, projectId, authDomain, appId) are missing. Firebase WILL FAIL to initialize properly. Check your .env file and Firebase project settings.");
}

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Lib] Firebase app initialized successfully.");
    // Initialize Analytics only on the client side and if measurementId is available
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
      console.log("[Firebase Lib] Firebase Analytics initialized.");
    }
  } catch (e: any) {
    console.error("[Firebase Lib CRITICAL ERROR] Failed to initialize Firebase app:", e.message, e);
    // @ts-ignore
    app = null; 
  }
} else {
  app = getApps()[0]!;
  console.log("[Firebase Lib] Firebase app already initialized.");
  if (typeof window !== 'undefined' && firebaseConfig.measurementId && app) {
    try {
      analytics = getAnalytics(app);
      console.log("[Firebase Lib] Firebase Analytics ensured.");
    } catch (e) {
        console.warn("[Firebase Lib] Could not re-initialize Analytics on HMR:", e);
    }
  }
}

let auth: Auth;
let db: Firestore;

if (app!) {
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("[Firebase Lib] Auth and Firestore services obtained from app.");

  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Lib] Development mode detected. Checking for emulators...');
    try {
      // Check if emulators are already running (less robust way, but avoids re-connecting if HMR)
      // A more robust check might involve querying emulator status if an API existed for it in client SDK.
      // For now, we assume if connect...Emulator is called, it's fine.
      console.log('[Firebase Lib] Attempting to connect to Firebase Emulators (Auth on 9099, Firestore on 8080).');
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('[Firebase Lib] Successfully connected to Firestore and Auth emulators (if they are running and this is the first connection attempt).');
    } catch (error) {
      console.warn('[Firebase Lib] Warning connecting to Firebase emulators (they might not be running, or already connected):', error);
    }
  } else {
    console.log('[Firebase Lib] Production mode detected. Connecting to live Firebase services.');
  }
} else {
  console.error("[Firebase Lib CRITICAL ERROR] Firebase app failed to initialize. Auth and Firestore services will NOT be available.");
  // @ts-ignore
  auth = null; 
  // @ts-ignore
  db = null;
}

export { app, auth, db, analytics };
