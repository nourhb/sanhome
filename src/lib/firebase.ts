
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
// Cloudinary handles storage, so Firebase Storage is not initialized here.

// Your web app's Firebase configuration
// IMPORTANT: These values are read from environment variables.
// Ensure your .env file is correctly populated.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Ensure this is set in .env
};

// Log the configuration being used (excluding sensitive parts for client-side logs if this were client-side)
// Since this runs on server and client, be mindful if logging in shared code.
// For server actions, these logs will appear in the server terminal.
console.log("[Firebase Lib] Initializing Firebase with Project ID:", firebaseConfig.projectId);
if (!firebaseConfig.appId) {
  console.warn("[Firebase Lib] NEXT_PUBLIC_FIREBASE_APP_ID is not set in .env. Firebase initialization might be incomplete.");
}
if (!firebaseConfig.apiKey) {
  console.warn("[Firebase Lib] NEXT_PUBLIC_FIREBASE_API_KEY is not set. Firebase might fail to initialize.");
}


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("[Firebase Lib] Firebase app initialized successfully.");
} else {
  app = getApps()[0]!;
  console.log("[Firebase Lib] Firebase app already initialized.");
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
