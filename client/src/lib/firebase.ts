import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider as GoogleAuthProviderClass,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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

// Store pending auth callback for Capacitor Browser flow
let pendingAuthCallback: ((result: SocialLoginResult | null) => void) | null = null;

// Called by App.tsx when auth callback URL is received
export function handleAuthCallback(idToken: string | null) {
  if (pendingAuthCallback) {
    if (idToken) {
      pendingAuthCallback({ idToken });
    } else {
      pendingAuthCallback(null);
    }
    pendingAuthCallback = null;
  }
}

export async function signInWithGoogle(): Promise<SocialLoginResult> {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // iOS/Android: Open Google OAuth in actual Safari browser
      console.log('📱 Using Capacitor Browser for native Google OAuth');
      
      // Open server OAuth endpoint in Safari
      const baseUrl = window.location.origin;
      const authUrl = `${baseUrl}/api/auth/google/start`;
      
      await Browser.open({ url: authUrl });
      
      // Return a promise that will be resolved by the callback handler
      return new Promise((resolve, reject) => {
        pendingAuthCallback = (result) => {
          if (result) {
            console.log('✅ Google auth callback received');
            resolve(result);
          } else {
            reject(new Error('Google 로그인이 취소되었습니다.'));
          }
        };
        
        // Timeout after 5 minutes
        setTimeout(() => {
          if (pendingAuthCallback) {
            pendingAuthCallback = null;
            reject(new Error('Google 로그인 시간이 초과되었습니다.'));
          }
        }, 5 * 60 * 1000);
      });
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
    console.error('Google sign in error:', error);
    throw new Error(error.message || 'Google 로그인에 실패했습니다.');
  }
}

export async function signInWithApple(): Promise<SocialLoginResult> {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // iOS/Android: Open Apple OAuth in actual Safari browser
      console.log('📱 Using Capacitor Browser for native Apple OAuth');
      
      // Open server OAuth endpoint in Safari
      const baseUrl = window.location.origin;
      const authUrl = `${baseUrl}/api/auth/apple/start`;
      
      await Browser.open({ url: authUrl });
      
      // Return a promise that will be resolved by the callback handler
      return new Promise((resolve, reject) => {
        pendingAuthCallback = (result) => {
          if (result) {
            console.log('✅ Apple auth callback received');
            resolve(result);
          } else {
            reject(new Error('Apple 로그인이 취소되었습니다.'));
          }
        };
        
        // Timeout after 5 minutes
        setTimeout(() => {
          if (pendingAuthCallback) {
            pendingAuthCallback = null;
            reject(new Error('Apple 로그인 시간이 초과되었습니다.'));
          }
        }, 5 * 60 * 1000);
      });
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
