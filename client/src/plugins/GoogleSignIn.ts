import { registerPlugin } from '@capacitor/core';

export interface GoogleSignInPlugin {
  signIn(): Promise<{ idToken: string; serverAuthCode?: string }>;
}

const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn', {
  web: () => import('./web').then(m => new m.GoogleSignInWeb()),
});

export default GoogleSignIn;
