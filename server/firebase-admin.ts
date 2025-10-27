import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.warn('⚠️ Firebase Admin SDK not configured - social login will not work');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      projectId,
    });
    
    console.log('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    return null;
  }
}

export function getFirebaseAuth() {
  if (!firebaseApp) {
    initializeFirebaseAdmin();
  }
  
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  return admin.auth(firebaseApp);
}

export async function verifyIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (error: any) {
    console.error('❌ ID token verification failed:', error.message);
    return {
      success: false,
      error: error.message || 'Invalid ID token',
    };
  }
}
