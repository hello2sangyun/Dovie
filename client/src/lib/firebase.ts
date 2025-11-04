import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

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
  idToken: string;
}

export async function signInWithGoogle(): Promise<SocialLoginResult> {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // iOS/Android: Use redirect flow
      console.log('📱 Using signInWithRedirect for native platform');
      await signInWithRedirect(auth, googleProvider);
      
      // Redirect happens here, result will be handled on app resume
      throw new Error('REDIRECT_IN_PROGRESS');
    } else {
      // Web: Use popup flow
      console.log('🌐 Using signInWithPopup for web platform');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const idToken = await user.getIdToken();
      
      return {
        idToken,
      };
    }
  } catch (error: any) {
    if (error.message === 'REDIRECT_IN_PROGRESS') {
      throw error;
    }
    console.error('Google sign in error:', error);
    throw new Error(error.message || 'Google 로그인에 실패했습니다.');
  }
}

// Check for redirect result when app resumes
export async function checkRedirectResult(): Promise<SocialLoginResult | null> {
  try {
    const result = await getRedirectResult(auth);
    
    if (result && result.user) {
      console.log('✅ Redirect result found:', result.user.email);
      const idToken = await result.user.getIdToken();
      
      return {
        idToken,
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('Redirect result error:', error);
    return null;
  }
}

export async function signInWithApple(): Promise<SocialLoginResult> {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // iOS/Android: Use redirect flow
      console.log('📱 Using signInWithRedirect for native platform');
      await signInWithRedirect(auth, appleProvider);
      
      // Redirect happens here, result will be handled on app resume
      throw new Error('REDIRECT_IN_PROGRESS');
    } else {
      // Web: Use popup flow
      console.log('🌐 Using signInWithPopup for web platform');
      const result = await signInWithPopup(auth, appleProvider);
      const user = result.user;
      
      const idToken = await user.getIdToken();
      
      return {
        idToken,
      };
    }
  } catch (error: any) {
    if (error.message === 'REDIRECT_IN_PROGRESS') {
      throw error;
    }
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
