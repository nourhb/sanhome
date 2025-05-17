
"use client";

import type { User as FirebaseUser, AuthError } from "firebase/auth";
import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  type ReactNode 
} from "react";
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendEmailVerification
} from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // Import db
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"; // Import Firestore functions

// Define types for login and signup form values if not already available
// For now, using simple email/password structure
interface AuthFormValues {
  email: string;
  password: string;
}

// Extend FirebaseUser to include our custom role if needed, or manage role separately
export interface AppUser extends FirebaseUser {
  appRole?: string; // Or 'admin', 'patient', 'nurse' etc.
}

interface AuthContextType {
  currentUser: AppUser | null;
  userRole: string | null; // e.g., 'admin', 'patient', 'nurse'
  loading: boolean;
  signup: (values: AuthFormValues & { // Include additional signup fields
    firstName: string;
    lastName: string;
    role: string;
    phoneNumber: string;
    address: string;
    dateOfBirth: Date;
    gender: string;
  }) => Promise<{ user?: FirebaseUser; error?: AuthError }>;
  login: (values: AuthFormValues) => Promise<{ user?: FirebaseUser; error?: AuthError }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, now fetch their role from Firestore
        // The 'role' field is expected in the 'users' collection, document ID = user.uid
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setCurrentUser({ ...user, appRole: userData.role } as AppUser);
          setUserRole(userData.role || null); // Set the role based on Firestore data
        } else {
          // No custom profile yet, or role not set
          setCurrentUser(user as AppUser);
          setUserRole(null);
          console.warn(`No Firestore profile found for user ${user.uid} in 'users' collection, role will be null.`);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signup = async (values: AuthFormValues & { 
    firstName: string; 
    lastName: string; 
    role: string;
    phoneNumber: string;
    address: string;
    dateOfBirth: Date;
    gender: string;
   }) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const fbUser = userCredential.user;
      if (fbUser) {
        // Save additional user info to Firestore users collection
        const userDocRef = doc(db, "users", fbUser.uid);
        await setDoc(userDocRef, {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          role: values.role, // This is the role selected during signup
          phoneNumber: values.phoneNumber,
          address: values.address,
          dateOfBirth: values.dateOfBirth, // Store as Firestore Timestamp if preferred
          gender: values.gender,
          createdAt: serverTimestamp(),
        });
        setCurrentUser({ ...fbUser, appRole: values.role } as AppUser);
        setUserRole(values.role);
        await sendEmailVerification(fbUser);
      }
      return { user: fbUser };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const login = async (values: AuthFormValues) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // Auth state change will trigger useEffect to fetch role
      return { user: userCredential.user };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // Auth state change will clear user and role
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userRole,
    loading,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
