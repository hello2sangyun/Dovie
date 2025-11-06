import { initializeApp, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  indexedDBLocalPersistence,
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
      // iOS/Android 네이티브 앱 - Safari 리디렉트 방식 사용
      console.log('📱 Using Firebase signInWithRedirect for native app');
      
      // Safari 브라우저로 리디렉트 (Google 로그인 → 자동으로 앱 복귀)
      await signInWithRedirect(auth, googleProvider);
      
      // 리디렉트 후 돌아올 때 getRedirectResult로 처리됨
      // 이 함수는 여기서 끝나고, 앱이 재시작될 때 handleRedirectResult()가 호출됨
      return { idToken: '' }; // 실제로는 여기까지 실행 안 됨
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

// 리디렉트 결과 처리 (앱 시작 시 자동 호출)
export async function handleRedirectResult(): Promise<SocialLoginResult | null> {
  try {
    console.log('🔍 Checking for redirect result...');
    const result = await getRedirectResult(auth);
    
    if (result) {
      console.log('✅ Redirect result found:', result.user.email);
      const idToken = await result.user.getIdToken();
      
      return {
        idToken,
      };
    }
    
    console.log('ℹ️ No redirect result found');
    return null;
  } catch (error: any) {
    console.error('❌ Error handling redirect result:', error);
    return null;
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
