# iOS Google Login Setup Guide

This guide explains how to set up Google authentication for iOS using Firebase's redirect-based authentication in a Capacitor app.

## Overview

The app now uses **Firebase's redirect-based authentication** instead of popup-based authentication for iOS. This is required because:
1. Native iOS apps cannot use popup windows
2. Safari blocks popup windows in iOS WebView
3. Redirect flow is the only reliable method for native platforms

## How It Works

### Web Platform (Browser)
- Uses `signInWithPopup()` - Opens Google login in a popup window
- User logs in and returns immediately with ID token
- Works perfectly in desktop/mobile browsers

### Native Platform (iOS/Android)  
- Uses `signInWithRedirect()` - Opens Google login in Safari/Chrome
- User logs in in external browser
- Returns to app via URL scheme
- App checks for redirect result on resume

## Code Changes Made

### 1. Firebase Authentication (`client/src/lib/firebase.ts`)

Added platform detection and redirect handling:

```typescript
export async function signInWithGoogle(): Promise<SocialLoginResult> {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // iOS/Android: Use redirect flow
    await signInWithRedirect(auth, googleProvider);
    throw new Error('REDIRECT_IN_PROGRESS');
  } else {
    // Web: Use popup flow
    const result = await signInWithPopup(auth, googleProvider);
    return { idToken: await result.user.getIdToken() };
  }
}

export async function checkRedirectResult(): Promise<SocialLoginResult | null> {
  const result = await getRedirectResult(auth);
  if (result && result.user) {
    return { idToken: await result.user.getIdToken() };
  }
  return null;
}
```

### 2. Login/Signup Pages

Added redirect result checking on mount:

```typescript
useEffect(() => {
  const handleRedirectResult = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    const result = await checkRedirectResult();
    if (result) {
      // Process login with ID token
      const response = await apiRequest("/api/auth/social-login", "POST", {
        idToken: result.idToken,
        authProvider: 'google',
      });
      // ... handle success
    }
  };
  
  handleRedirectResult();
}, []);
```

## iOS Native Configuration Required

### Step 1: Add URL Scheme in Xcode

1. Open your project in Xcode:
   ```bash
   npx cap open ios
   ```

2. Select your app target → **Info** tab

3. Expand **URL Types** → Click **+** button

4. Add Firebase Auth URL Scheme:
   - **Identifier**: `com.googleusercontent.apps`
   - **URL Schemes**: Your Firebase `REVERSED_CLIENT_ID`
     - Find this in `ios/App/App/GoogleService-Info.plist`
     - Looks like: `com.googleusercontent.apps.123456789-abcdefg`
   - **Role**: Editor

### Step 2: Configure Info.plist

Add the following to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
    </array>
  </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>googlechrome</string>
  <string>googlechromes</string>
</array>
```

Replace `YOUR_CLIENT_ID` with your actual reversed client ID.

### Step 3: Update AppDelegate.swift

Add URL handling to `ios/App/App/AppDelegate.swift`:

```swift
import UIKit
import Capacitor
import FirebaseCore

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Firebase initialization
        FirebaseApp.configure()
        return true
    }
    
    // Handle OAuth redirect URL
    func application(_ app: UIApplication, 
                     open url: URL, 
                     options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
```

### Step 4: Verify Firebase Configuration

Ensure `GoogleService-Info.plist` is in `ios/App/App/` directory with:
- `REVERSED_CLIENT_ID`
- `CLIENT_ID`
- `BUNDLE_ID` matching your app's bundle ID

## Testing Flow

### Expected Behavior

1. **User taps "Google로 로그인"**
   - App calls `signInWithRedirect()`
   - Safari/Chrome browser opens with Google login page
   - URL redirects to: `https://dovie-technologies.firebaseapp.com/__/auth/handler`

2. **User completes Google authentication**
   - Browser shows success page
   - App automatically resumes via URL scheme
   - URL format: `com.googleusercontent.apps.YOUR_CLIENT_ID://...`

3. **App processes redirect result**
   - `checkRedirectResult()` retrieves ID token
   - Sends token to backend `/api/auth/social-login`
   - User is logged in and redirected to `/app`

### Debug Logs

Look for these console logs:

```
📱 Using signInWithRedirect for native platform
📱 Redirect initiated, waiting for callback...
✅ Redirect result found: user@example.com
📱 Processing redirect result
```

## Common Issues

### Issue 1: "Cross-origin redirect denied"
**Cause**: Using popup-based auth on iOS (now fixed)
**Solution**: Code now uses redirect-based auth automatically

### Issue 2: App doesn't resume after Google login
**Cause**: URL scheme not configured in Xcode
**Solution**: 
- Verify URL Types in Xcode
- Check `REVERSED_CLIENT_ID` matches exactly
- Ensure no typos in URL scheme

### Issue 3: "Redirect result not found"
**Cause**: App cleared state or URL scheme mismatch
**Solution**:
- Check AppDelegate.swift has URL handler
- Verify GoogleService-Info.plist is included
- Clean build: `npx cap sync ios`

### Issue 4: Stuck at Firebase redirect URL
**Cause**: URL scheme not returning to app
**Solution**:
- Double-check `REVERSED_CLIENT_ID` in URL Types
- Ensure bundle ID matches Firebase console
- Test on real device (simulator has limitations)

## Development vs Production

### Development
- Uses web-based testing (popup works fine)
- Test on iOS simulator with redirect flow
- Check Xcode console for logs

### Production
- Must use redirect flow for App Store apps
- Test on real iOS device
- Verify URL scheme works before submission

## Verification Checklist

Before testing:
- [ ] `GoogleService-Info.plist` is in `ios/App/App/`
- [ ] URL Types configured in Xcode with correct `REVERSED_CLIENT_ID`
- [ ] AppDelegate.swift has `application(_:open:options:)` method
- [ ] `capacitor.config.ts` has correct `appId`
- [ ] Ran `npx cap sync ios` after changes
- [ ] Built app in Xcode successfully

## Additional Resources

- [Firebase iOS Setup](https://firebase.google.com/docs/auth/ios/google-signin)
- [Capacitor iOS Configuration](https://capacitorjs.com/docs/ios/configuration)
- [Apple URL Scheme Documentation](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)

## Next Steps

After completing iOS setup:
1. Test Google login on iOS device
2. Verify redirect flow works end-to-end
3. Test with different Google accounts
4. Enable Apple Sign-In (similar redirect flow)
5. Deploy to TestFlight for beta testing
