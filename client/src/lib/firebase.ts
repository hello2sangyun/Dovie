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
      // iOS/Android 네이티브 앱 - Safari 리다이렉트 사용
      console.log('📱 Using Safari redirect for Google Sign-In');
      await signInWithRedirect(auth, googleProvider);
      // Safari로 이동하므로 여기서는 반환하지 않음
      // 앱으로 돌아오면 getRedirectResult로 처리
      return { idToken: '' }; // 임시, 실제로는 redirect 후 처리
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
      // iOS/Android 네이티브 앱 - Safari 리다이렉트 사용
      console.log('📱 Using Safari redirect for Apple Sign-In');
      await signInWithRedirect(auth, appleProvider);
      // Safari로 이동하므로 여기서는 반환하지 않음
      // 앱으로 돌아오면 getRedirectResult로 처리
      return { idToken: '' }; // 임시, 실제로는 redirect 후 처리
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
    // Web SDK 로그아웃 (네이티브/웹 모두 동일)
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Firebase sign out error:', error);
  }
}

// 리다이렉트 결과 확인 (앱 시작 시 호출)
export async function checkRedirectResult(): Promise<SocialLoginResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return { idToken };
    }
    return null;
  } catch (error: any) {
    console.error('Redirect result error:', error);
    return null;
  }
}
