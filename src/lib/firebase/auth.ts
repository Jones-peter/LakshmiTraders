
import { 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type UserCredential,
  type User,
  type NextOrObserver,
  type AuthError
} from "firebase/auth";
import { auth } from "./config"; // Ensure this path is correct

// Sign In
export async function signInWithEmail(email: string, pass: string): Promise<UserCredential> {
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, pass);
    // You can set a cookie here if needed for middleware or SSR auth checks
    // For example: document.cookie = `firebaseAuthToken=${await userCredential.user.getIdToken()}; path=/; max-age=3600`;
    return userCredential;
  } catch (error) {
    // console.error("Error signing in with email and password:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

// Sign Out
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    // Clear any auth cookies if you've set them
    // document.cookie = 'firebaseAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (error) {
    // console.error("Error signing out:", error);
    throw error;
  }
}

// Auth State Listener
export function onAuthStateChanged(callback: NextOrObserver<User>): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

// Helper to get current user (can be null)
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
