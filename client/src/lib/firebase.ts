import { initializeApp, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  indexedDBLocalPersistence,
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import GoogleSignIn from '@/plugins/GoogleSignIn';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// iOS용 indexedDBLocalPersistence 사용 (중요!)
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(getApp(), { 
      persistence: indexedDBLocalPersistence 
    })
  : getAuth(app);

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
      // iOS/Android 네이티브 앱 - Google Sign-In SDK 직접 사용
      console.log('📱 Using native Google Sign-In SDK');
      
      // 1. Google Sign-In으로 ID Token 받기
      const googleResult = await GoogleSignIn.signIn();
      console.log('✅ Native Google Sign-In Success');
      
      // 2. 서버에 Google ID Token 전송 → Firebase Custom Token 받기
      const response = await fetch('/api/auth/google-native', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: googleResult.idToken }),
      });
      
      if (!response.ok) {
        throw new Error('서버 인증 실패');
      }
      
      const data = await response.json();
      console.log('✅ Firebase Custom Token received');
      
      // 3. Custom Token으로 Firebase 인증
      await signInWithCustomToken(auth, data.customToken);
      console.log('✅ Firebase authenticated with custom token');
      
      return {
        idToken: googleResult.idToken,
      };
    } else {
      // 웹 브라우저 - Firebase Web SDK 팝업 사용
      console.log('🌐 Using web Google Sign-In popup');
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
      // TODO: Apple Sign-In SDK 구현 (현재는 웹 방식 사용)
      console.log('📱 Apple Sign-In - 아직 미구현');
      throw new Error('Apple 로그인은 아직 지원되지 않습니다.');
    } else {
      // 웹 브라우저 - Firebase Web SDK 팝업 사용
      console.log('🌐 Using web Apple Sign-In popup');
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
    // Web SDK 로그아웃
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Firebase sign out error:', error);
  }
}
