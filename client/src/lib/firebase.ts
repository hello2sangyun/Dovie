import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export interface SocialLoginResult {
  providerId: string;
  providerEmail: string;
  displayName: string;
  profilePicture: string | null;
  firebaseUid: string;
}

export async function signInWithGoogle(): Promise<SocialLoginResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return {
      providerId: user.uid,
      providerEmail: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      profilePicture: user.photoURL,
      firebaseUid: user.uid,
    };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    throw new Error(error.message || 'Google 로그인에 실패했습니다.');
  }
}

export async function signInWithApple(): Promise<SocialLoginResult> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;
    
    return {
      providerId: user.uid,
      providerEmail: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      profilePicture: user.photoURL,
      firebaseUid: user.uid,
    };
  } catch (error: any) {
    console.error('Apple sign in error:', error);
    throw new Error(error.message || 'Apple 로그인에 실패했습니다.');
  }
}

export async function signOutFirebase() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Firebase sign out error:', error);
  }
}
