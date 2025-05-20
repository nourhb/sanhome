
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
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Now read from .env
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Now read from .env
};

// Log the configuration being used (excluding sensitive parts for client-side logs if this were client-side)
// Since this runs on server and client, be mindful if logging in shared code.
// For server actions, these logs will appear in the server terminal.
console.log("[Firebase Lib] Initializing Firebase with Project ID:", firebaseConfig.projectId);
if (!firebaseConfig.apiKey) {
  console.warn("[Firebase Lib] NEXT_PUBLIC_FIREBASE_API_KEY is not set. Firebase might fail to initialize.");
}
if (!firebaseConfig.appId) {
  console.warn("[Firebase Lib] NEXT_PUBLIC_FIREBASE_APP_ID is not set in .env. Firebase initialization might be incomplete.");
} else {
  console.log("[Firebase Lib] Using App ID:", firebaseConfig.appId);
}
if (!firebaseConfig.measurementId) {
  console.warn("[Firebase Lib] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is not set in .env. Firebase Analytics might not work as expected.");
} else {
  console.log("[Firebase Lib] Using Measurement ID:", firebaseConfig.measurementId);
}


// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null; // Initialize analytics as null

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("[Firebase Lib] Firebase app initialized successfully.");
  // Initialize Analytics only on the client side and if measurementId is available
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
    console.log("[Firebase Lib] Firebase Analytics initialized.");
  }
} else {
  app = getApps()[0]!;
  console.log("[Firebase Lib] Firebase app already initialized.");
  // Initialize Analytics if not already initialized (e.g. HMR)
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app); // This will get the existing instance or create one
      console.log("[Firebase Lib] Firebase Analytics ensured.");
    } catch (e) {
        console.warn("[Firebase Lib] Could not initialize Analytics on re-render/HMR:", e);
    }
  }
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

if (process.env.NODE_ENV === 'development') {
  try {
    console.log('[Firebase Lib] Development mode: Attempting to connect to emulators...');
    // Ensure db and auth are initialized before connecting to emulators
    if (db) connectFirestoreEmulator(db, 'localhost', 8080);
    if (auth) connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('[Firebase Lib] Successfully connected to Firestore and Auth emulators (if they are running).');
  } catch (error) {
    console.error('[Firebase Lib] Error connecting to Firebase emulators:', error);
  }
}


export { app, auth, db, analytics };
