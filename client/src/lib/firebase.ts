import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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
      // iOS/Android 네이티브 앱 - Capacitor 플러그인 사용 (앱 내부 팝업)
      console.log('📱 Using native Google Sign-In');
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      if (!result.credential?.idToken) {
        throw new Error('ID token not received from native auth');
      }
      
      return {
        idToken: result.credential.idToken,
      };
    } else {
      // 웹 브라우저 - Firebase Web SDK 사용
      console.log('🌐 Using web Google Sign-In');
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
      // iOS/Android 네이티브 앱 - Capacitor 플러그인 사용 (앱 내부 팝업)
      console.log('📱 Using native Apple Sign-In');
      const result = await FirebaseAuthentication.signInWithApple();
      
      if (!result.credential?.idToken) {
        throw new Error('ID token not received from native auth');
      }
      
      return {
        idToken: result.credential.idToken,
      };
    } else {
      // 웹 브라우저 - Firebase Web SDK 사용
      console.log('🌐 Using web Apple Sign-In');
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
