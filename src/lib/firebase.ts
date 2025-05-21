
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics"; // Import Analytics

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
console.log("[Firebase Lib] Attempting to initialize Firebase with the following configuration:");
console.log(`[Firebase Lib] Project ID: ${firebaseConfig.projectId}`);
console.log(`[Firebase Lib] Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`[Firebase Lib] App ID: ${firebaseConfig.appId ? firebaseConfig.appId : 'NOT SET - This is critical!'}`);
console.log(`[Firebase Lib] Measurement ID: ${firebaseConfig.measurementId ? firebaseConfig.measurementId : 'NOT SET'}`);

if (!firebaseConfig.apiKey) {
  console.error("[Firebase Lib ERROR] NEXT_PUBLIC_FIREBASE_API_KEY is not set. Firebase WILL FAIL to initialize.");
}
if (!firebaseConfig.projectId) {
  console.error("[Firebase Lib ERROR] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. Firebase WILL FAIL to initialize.");
}
if (!firebaseConfig.authDomain) {
  console.error("[Firebase Lib ERROR] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not set. Firebase WILL FAIL to initialize.");
}
if (!firebaseConfig.appId) {
  console.warn("[Firebase Lib WARN] NEXT_PUBLIC_FIREBASE_APP_ID is not set in .env. Firebase initialization might be incomplete or fail for certain services.");
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
    app = null; // Ensure app is null if initialization fails
  }
} else {
  app = getApps()[0]!;
  console.log("[Firebase Lib] Firebase app already initialized.");
  if (typeof window !== 'undefined' && firebaseConfig.measurementId && app) {
    try {
      analytics = getAnalytics(app);
      console.log("[Firebase Lib] Firebase Analytics ensured.");
    } catch (e) {
        console.warn("[Firebase Lib] Could not initialize Analytics on re-render/HMR:", e);
    }
  }
}

// Ensure auth and db are initialized only if app initialization was successful
let auth: Auth;
let db: Firestore;

if (app!) { // Check if app is not null
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("[Firebase Lib] Auth and Firestore services obtained from app.");

  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('[Firebase Lib] Development mode: Attempting to connect to emulators...');
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('[Firebase Lib] Successfully connected to Firestore and Auth emulators (if they are running).');
    } catch (error) {
      console.error('[Firebase Lib] Error connecting to Firebase emulators:', error);
    }
  }
} else {
  console.error("[Firebase Lib CRITICAL ERROR] Firebase app failed to initialize. Auth and Firestore services will NOT be available.");
  // @ts-ignore
  auth = null; // Explicitly set to null or a mock/dummy object if necessary for type safety elsewhere
  // @ts-ignore
  db = null;
}


export { app, auth, db, analytics };

    