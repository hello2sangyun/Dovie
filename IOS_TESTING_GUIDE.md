# Dovie Messenger - iOS 네이티브 앱 테스트 가이드

## 📱 변경 사항 요약

### 1. 앱 아이콘 (App Icon)
- **위치**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **아이콘**: Dovie 로고 (텍스트 없는 버전)
- **크기**: 모든 iOS 필수 크기 (20x20 ~ 1024x1024)
- **적용**: 홈 화면, 앱 전환기, 설정 등

### 2. 스플래쉬 스크린 (Splash Screen)
- **네이티브 스플래쉬**: `ios/App/App/Assets.xcassets/Splash.imageset/`
  - iOS LaunchScreen.storyboard에서 표시
  - 앱 시작 즉시 0.5~1초간 표시
  
- **React 스플래쉬**: `client/src/components/SplashScreen.tsx`
  - 네이티브 앱에서만 표시 (웹에서는 표시 안 함)
  - 네이티브 LaunchScreen 이후 1.5초간 표시
  - Dovie 로고 + 텍스트 버전 중앙 정렬
  - 흰색 배경, 부드러운 페이드 아웃

### 3. 푸시 알림 아이콘
- **위치**: `client/public/dovie-icon.png`
- **서버 코드**: `server/push-notifications.ts`
- **적용**: PWA 및 웹 푸시 알림 아이콘

---

## 🚀 Mac에서 테스트하기

### Step 1: Git Pull

```bash
# 프로젝트 디렉토리로 이동
cd ~/path/to/dovie-messenger

# 최신 변경사항 가져오기
git pull origin main

# 또는 특정 브랜치에서 가져오기
git pull origin your-branch-name
```

### Step 2: 의존성 설치

```bash
# Node.js 패키지 설치
npm install

# iOS CocoaPods 의존성 설치 (iOS 폴더 내에서)
cd ios/App
pod install
cd ../..
```

### Step 3: 프론트엔드 빌드

```bash
# Vite로 프론트엔드 빌드
npm run build
```

### Step 4: Capacitor 동기화

```bash
# Capacitor를 통해 웹 빌드를 네이티브 프로젝트에 복사
npx cap sync ios

# 또는 강제 동기화 (권장)
npx cap copy ios && npx cap update ios
```

**중요**: `npx cap sync ios` 명령어는 다음을 수행합니다:
- `client/dist` 폴더의 빌드 결과를 `ios/App/App/public`로 복사
- iOS 네이티브 의존성 업데이트
- Capacitor 플러그인 동기화

### Step 5: Xcode에서 열기

```bash
# Xcode workspace 열기
npx cap open ios

# 또는 직접 열기
open ios/App/App.xcworkspace
```

**주의**: 
- `.xcworkspace` 파일을 열어야 합니다 (`.xcodeproj`가 아님)
- CocoaPods를 사용하기 때문에 workspace 파일이 필수입니다

---

## 🔍 Xcode에서 확인할 사항

### 1. 앱 아이콘 확인

1. Xcode에서 프로젝트 열기
2. 왼쪽 네비게이터에서 `App` 프로젝트 선택
3. `App` → `Assets.xcassets` → `AppIcon` 클릭
4. 모든 크기의 Dovie 로고가 표시되는지 확인

**확인 포인트**:
- ✅ 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024 모든 크기 존재
- ✅ 보라색 비둘기 로고가 선명하게 보임
- ✅ 배경이 투명하거나 흰색

### 2. 스플래쉬 스크린 확인

1. `App` → `Assets.xcassets` → `Splash` 클릭
2. Dovie 로고 + 텍스트 이미지 확인
3. LaunchScreen.storyboard 확인
   - `App` → `App` → `LaunchScreen.storyboard` 클릭
   - 중앙에 스플래쉬 이미지가 배치되어 있는지 확인

**확인 포인트**:
- ✅ splash.png, splash@2x.png, splash@3x.png 모두 존재
- ✅ 이미지가 중앙에 배치됨
- ✅ 흰색 배경

### 3. 빌드 설정 확인

1. 프로젝트 선택 → `TARGETS` → `App` 선택
2. **General** 탭:
   - Display Name: `Dovie Messenger`
   - Bundle Identifier: `com.dovie.messenger`
   - Version: 확인
   - Build: 확인
   - App Icon Source: `AppIcon` 선택됨

3. **Signing & Capabilities** 탭:
   - Team 선택 (개인 Apple Developer 계정)
   - Automatically manage signing 체크
   - Push Notifications capability 확인

---

## ▶️ 실행 및 테스트

### 시뮬레이터에서 실행

1. Xcode 상단에서 시뮬레이터 선택
   - 예: `iPhone 15 Pro` 또는 `iPhone 14`
2. `Product` → `Run` (⌘R)
3. 시뮬레이터가 자동으로 시작되고 앱이 설치됨

**테스트 체크리스트**:
- [ ] 앱 아이콘이 홈 화면에 Dovie 로고로 표시됨
- [ ] 앱 실행 시 LaunchScreen에 스플래쉬 이미지 표시
- [ ] LaunchScreen 이후 React 스플래쉬 스크린 1.5초간 표시
- [ ] 스플래쉬 스크린 이후 정상적으로 앱 로딩
- [ ] 로그인/회원가입 화면 정상 동작

### 실제 기기에서 실행

1. iPhone/iPad를 Mac에 USB로 연결
2. 기기 신뢰 확인 (처음 연결 시)
3. Xcode 상단에서 연결된 기기 선택
4. `Product` → `Run` (⌘R)

**참고**: 
- 실제 기기 테스트를 위해서는 Apple Developer 계정 필요
- 무료 계정으로도 7일간 테스트 가능
- 푸시 알림 테스트는 실제 기기에서만 가능 (시뮬레이터 불가)

---

## 🔔 푸시 알림 테스트

### 1. 앱에서 푸시 알림 권한 허용

1. 앱 실행 후 로그인
2. 푸시 알림 권한 요청 팝업에서 "허용" 선택
3. 설정 → 알림에서 Dovie Messenger 알림 켜져 있는지 확인

### 2. 서버에서 테스트 푸시 전송

```bash
# Replit 프로젝트에서
npm run test-push -- --userId=YOUR_USER_ID
```

**확인 사항**:
- [ ] 알림 배너에 Dovie 로고 표시 (텍스트 없는 버전)
- [ ] 알림 제목 및 내용 정상 표시
- [ ] 알림 탭 시 앱이 열리고 해당 채팅방으로 이동
- [ ] 앱 아이콘에 배지 숫자 표시 (읽지 않은 메시지 수)

### 3. 푸시 알림 이미지 확인

iOS APNS 푸시 알림의 경우:
- 알림 아이콘은 앱 아이콘으로 자동 설정됨 (Apple 정책)
- 리치 알림(Rich Notification)에는 첨부 이미지 표시 가능
- 서버 코드에서 `/dovie-icon.png` 경로로 아이콘 제공

### 4. Rich Notification 설정 (선택 사항)

알림에 **큰 이미지를 표시**하고 싶다면 Rich Notification을 설정하세요!

📖 **상세 가이드**: [`IOS_RICH_NOTIFICATION_SETUP.md`](IOS_RICH_NOTIFICATION_SETUP.md) 참고

**Rich Notification을 설정하면**:
- ✅ 텍스트 메시지에도 Dovie 로고 큰 이미지 표시
- ✅ 이미지 메시지에 실제 이미지 미리보기
- ✅ 비디오 메시지에 썸네일 표시

**설정 방법 요약**:
1. Xcode에서 `Notification Service Extension` 추가
2. `NotificationService.swift` 코드 교체
3. 빌드 및 테스트

자세한 단계별 가이드는 `IOS_RICH_NOTIFICATION_SETUP.md` 파일을 참고하세요.

---

## 🐛 문제 해결 (Troubleshooting)

### 문제: 앱 아이콘이 표시되지 않음

**해결 방법**:
1. Xcode에서 `Product` → `Clean Build Folder` (⌘⇧K)
2. 시뮬레이터 리셋: `Device` → `Erase All Content and Settings`
3. 앱 재빌드 및 실행

### 문제: 스플래쉬 스크린이 표시되지 않음

**해결 방법**:
1. `npx cap sync ios` 다시 실행
2. Xcode에서 `Product` → `Clean Build Folder`
3. LaunchScreen.storyboard에서 이미지뷰가 Splash asset을 참조하는지 확인
4. 앱 재빌드

### 문제: 빌드 에러 발생

**일반적인 해결 방법**:
```bash
# Pod 캐시 삭제 및 재설치
cd ios/App
pod deintegrate
pod cache clean --all
pod install
cd ../..

# 캐시 삭제
npm run build
npx cap sync ios
```

### 문제: 푸시 알림이 오지 않음

**체크리스트**:
1. [ ] APNS 인증서 및 키가 올바르게 설정됨 (Replit Secrets)
2. [ ] 실제 기기에서 테스트 중 (시뮬레이터 불가)
3. [ ] 앱에서 푸시 알림 권한 허용됨
4. [ ] 서버 로그에서 푸시 전송 성공 확인
5. [ ] capacitor.config.ts에서 PushNotifications 플러그인 설정 확인

---

## 📝 추가 참고 사항

### Capacitor 설정 파일

**capacitor.config.ts**:
```typescript
{
  appId: 'com.dovie.messenger',
  appName: 'Dovie Messenger',
  webDir: 'client/dist',
  server: {
    url: 'https://dovie-hello2sangyun.replit.app',
    cleartext: false,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      spinnerColor: '#8B5CF6'
    }
  }
}
```

### 개발 vs 프로덕션 설정

**개발 중**:
- `server.url`: Replit 개발 서버 URL
- APNS: Development 모드
- Bundle ID: `com.dovie.messenger`

**프로덕션**:
- `server.url`: 실제 배포 서버 URL
- APNS: Production 모드
- App Store 배포를 위한 추가 설정 필요

---

## ✅ 최종 체크리스트

배포 전 모든 항목 확인:

- [ ] Git pull로 최신 코드 받기
- [ ] `npm install` 실행
- [ ] `npm run build` 성공
- [ ] `npx cap sync ios` 성공
- [ ] Xcode에서 앱 아이콘 확인
- [ ] Xcode에서 스플래쉬 이미지 확인
- [ ] 시뮬레이터에서 앱 정상 실행
- [ ] 실제 기기에서 앱 정상 실행
- [ ] 스플래쉬 스크린 정상 표시 (네이티브 + React)
- [ ] 푸시 알림 수신 테스트 (실제 기기)
- [ ] 푸시 알림에 Dovie 로고 표시 확인

---

## 🎉 완료!

모든 테스트가 성공적으로 완료되면, Dovie Messenger iOS 네이티브 앱이 준비된 것입니다!

**다음 단계**:
1. App Store Connect에 앱 등록
2. TestFlight을 통한 베타 테스트
3. App Store 심사 및 배포

궁금한 점이 있으면 언제든지 문의해주세요! 🚀
