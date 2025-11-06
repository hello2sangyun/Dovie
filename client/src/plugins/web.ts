import { WebPlugin } from '@capacitor/core';
import type { GoogleSignInPlugin } from './GoogleSignIn';

export class GoogleSignInWeb extends WebPlugin implements GoogleSignInPlugin {
  async signIn(): Promise<{ idToken: string; serverAuthCode?: string }> {
    throw new Error('Web implementation not available - use Firebase Web SDK instead');
  }
}
