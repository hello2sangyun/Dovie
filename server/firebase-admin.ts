import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase Admin SDK not configured - social login will not work');
    console.warn('   Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    return null;
  }

  try {
    // Private key 포맷 수정 (\n을 실제 줄바꿈으로 변환)
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
      projectId,
    });
    
    console.log('✅ Firebase Admin SDK initialized with service account credentials');
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

export async function createCustomToken(uid: string, additionalClaims?: object) {
  const auth = getFirebaseAuth();
  
  try {
    const customToken = await auth.createCustomToken(uid, additionalClaims);
    console.log(`✅ Custom token created for UID: ${uid}`);
    return {
      success: true,
      customToken,
    };
  } catch (error: any) {
    console.error('❌ Custom token creation failed:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to create custom token',
    };
  }
}
