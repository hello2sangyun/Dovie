import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { storage } from './storage';
import type { User } from '@shared/schema';

// Google OAuth 설정
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google 로그인 시도:', profile.id, profile.displayName);
      
      // 기존 Google 계정으로 가입된 사용자 확인
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (!user) {
        // 이메일로 기존 계정 확인
        const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (existingUser) {
          // 기존 계정에 Google ID 연결
          user = await storage.linkGoogleAccount(existingUser.id, profile.id);
        } else {
          // 새 계정 생성
          const newUser = {
            username: `google_${profile.id}`,
            displayName: profile.displayName || profile.name?.givenName || 'Google User',
            email: profile.emails?.[0]?.value || '',
            password: null,
            googleId: profile.id,
            loginProvider: 'google' as const,
            profilePicture: profile.photos?.[0]?.value,
            isProfileComplete: false
          };
          
          user = await storage.createUser(newUser);
          console.log('Google 계정으로 새 사용자 생성:', user.id);
        }
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      return done(error, null);
    }
  }));
}

// Facebook OAuth 설정
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'email', 'photos']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Facebook 로그인 시도:', profile.id, profile.displayName);
      
      // 기존 Facebook 계정으로 가입된 사용자 확인
      let user = await storage.getUserByFacebookId(profile.id);
      
      if (!user) {
        // 이메일로 기존 계정 확인
        const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (existingUser) {
          // 기존 계정에 Facebook ID 연결
          user = await storage.linkFacebookAccount(existingUser.id, profile.id);
        } else {
          // 새 계정 생성
          const newUser = {
            username: `facebook_${profile.id}`,
            displayName: profile.displayName || 'Facebook User',
            email: profile.emails?.[0]?.value || '',
            password: null,
            facebookId: profile.id,
            loginProvider: 'facebook' as const,
            profilePicture: profile.photos?.[0]?.value,
            isProfileComplete: false
          };
          
          user = await storage.createUser(newUser);
          console.log('Facebook 계정으로 새 사용자 생성:', user.id);
        }
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Facebook 로그인 오류:', error);
      return done(error, null);
    }
  }));
}

// 세션 직렬화
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;