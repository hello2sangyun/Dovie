# 🔥 Firebase iOS Google 로그인 설정 가이드

Dovie Messenger iOS 앱에서 Google 로그인이 앱 내부 팝업으로 작동하도록 Firebase를 설정하는 방법을 안내합니다.

## 📋 필수 사항

- Firebase 프로젝트 (이미 웹용으로 설정된 프로젝트 사용 가능)
- Xcode가 설치된 Mac 컴퓨터
- Dovie Messenger iOS 앱 프로젝트 (`ios/` 폴더)

---

## 🔧 1단계: Firebase Console에서 iOS 앱 추가

### 1. Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/)에 로그인
2. 기존 프로젝트 선택 (또는 새 프로젝트 생성)

### 2. iOS 앱 추가

1. 프로젝트 개요 페이지에서 **iOS 아이콘** 클릭
2. **앱 등록** 정보 입력:
   ```
   iOS 번들 ID: com.dovie.messenger
   앱 닉네임: Dovie Messenger (선택사항)
   App Store ID: (나중에 입력 가능)
   ```
3. **앱 등록** 클릭

### 3. GoogleService-Info.plist 다운로드

1. **GoogleService-Info.plist 다운로드** 클릭
2. 파일을 안전한 위치에 저장
3. **다음** 클릭

⚠️ **중요**: 이 파일에는 Firebase 프로젝트의 중요한 설정이 포함되어 있습니다.

---

## 📱 2단계: Xcode 프로젝트에 GoogleService-Info.plist 추가

### 1. Xcode에서 프로젝트 열기

```bash
cd ios
open App/App.xcworkspace
```

**주의**: `App.xcodeproj`가 아닌 `App.xcworkspace`를 열어야 합니다!

### 2. GoogleService-Info.plist 추가

1. Xcode 좌측 네비게이터에서 **App** 폴더 선택
2. 다운로드한 `GoogleService-Info.plist` 파일을 **App 폴더로 드래그**
3. 표시되는 다이얼로그에서:
   - ✅ **Copy items if needed** 체크
   - ✅ **Create groups** 선택
   - ✅ **Add to targets: App** 체크
4. **Finish** 클릭

### 3. 파일 위치 확인

Xcode 네비게이터에서 다음 구조로 표시되어야 합니다:
```
App
├── App
│   ├── AppDelegate.swift
│   ├── GoogleService-Info.plist  ← 여기에 있어야 함
│   └── ...
```

---

## 🔑 3단계: Google Sign-In 설정

### 1. URL Schemes 추가

1. Xcode에서 **App** 타겟 선택
2. **Info** 탭 클릭
3. **URL Types** 섹션 찾기 (맨 아래)
4. **+** 버튼 클릭하여 새 URL Scheme 추가

### 2. REVERSED_CLIENT_ID 추가

`GoogleService-Info.plist` 파일을 열어서 `REVERSED_CLIENT_ID` 값 복사:

1. Xcode에서 `GoogleService-Info.plist` 선택
2. `REVERSED_CLIENT_ID` 키의 값 복사 (예: `com.googleusercontent.apps.123456789`)
3. 복사한 값을 새 URL Scheme의 **URL Schemes** 필드에 붙여넣기
4. **Identifier**는 `GoogleSignIn`으로 입력

**결과**:
```
URL Schemes: com.googleusercontent.apps.123456789-abcdefghijk
Identifier: GoogleSignIn
Role: Editor
```

---

## 🔐 4단계: OAuth 클라이언트 ID 확인

### 1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인
2. Firebase 프로젝트와 연결된 프로젝트 선택
3. **APIs & Services** → **Credentials** 이동

### 2. OAuth 2.0 클라이언트 ID 확인

Firebase iOS 앱을 추가하면 자동으로 iOS OAuth 클라이언트 ID가 생성됩니다.

다음 항목들이 있는지 확인:
- ✅ **Web client (auto created by Google Service)** - 웹용
- ✅ **iOS client (auto created by Google Service)** - iOS용

iOS 클라이언트 ID의 번들 ID가 `com.dovie.messenger`인지 확인하세요.

---

## 🏗️ 5단계: Capacitor 동기화

### 1. ios 폴더 재생성 (선택사항)

프로젝트 루트에서:

```bash
# 기존 ios 폴더 삭제 (백업 권장)
rm -rf ios

# Capacitor 프로젝트 재생성
npx cap add ios

# GoogleService-Info.plist를 다시 추가
# (2단계 반복)
```

### 2. 변경사항 동기화

프로젝트 루트에서:

```bash
# 웹 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync ios
```

---

## ✅ 6단계: 테스트

### 1. Xcode에서 빌드

```bash
cd ios
open App/App.xcworkspace
```

1. 시뮬레이터 또는 실제 디바이스 선택
2. **Product** → **Run** (또는 ⌘R)

### 2. Google 로그인 테스트

1. 앱 실행 후 로그인 페이지로 이동
2. **Google 로그인** 버튼 클릭
3. ✅ **앱 내부에서 Google 로그인 팝업이 나타나야 함**
4. ❌ **외부 사파리로 이동하면 안됨**

### 3. 로그 확인

Xcode 콘솔에서 다음 로그 확인:
```
📱 Using native Google Sign-In
```

웹 브라우저에서는:
```
🌐 Using web Google Sign-In
```

---

## 🐛 문제 해결

### GoogleService-Info.plist를 찾을 수 없음

**증상**: 빌드 시 "GoogleService-Info.plist not found" 오류

**해결**:
1. Xcode에서 `GoogleService-Info.plist` 파일이 **App** 타겟에 포함되어 있는지 확인
2. File Inspector (⌥⌘1)에서 **Target Membership**에 App이 체크되어 있는지 확인

### Google 로그인 후 콜백이 안됨

**증상**: Google 로그인 완료 후 앱으로 돌아오지 않음

**해결**:
1. URL Schemes에 `REVERSED_CLIENT_ID`가 정확히 입력되었는지 확인
2. `GoogleService-Info.plist`의 `REVERSED_CLIENT_ID` 값과 URL Schemes 값이 동일한지 확인

### "App not verified" 오류

**증상**: Google 로그인 시 "This app isn't verified" 경고

**해결**:
- **개발 중**: "Advanced" → "Go to app (unsafe)" 클릭하여 계속 진행
- **프로덕션**: Google Cloud Console에서 OAuth consent screen 설정 필요

### iOS 시뮬레이터에서 작동 안함

**증상**: 시뮬레이터에서 로그인이 실패함

**해결**:
- iOS 시뮬레이터는 Google Sign-In이 제한될 수 있음
- **실제 iOS 디바이스**에서 테스트 권장

---

## 📚 참고 자료

- [Firebase iOS 설정 가이드](https://firebase.google.com/docs/ios/setup)
- [Capacitor Firebase Authentication](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/authentication)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start-integrating)

---

## 🎯 요약

1. ✅ Firebase Console에서 iOS 앱 추가
2. ✅ `GoogleService-Info.plist` 다운로드 및 Xcode에 추가
3. ✅ URL Schemes에 `REVERSED_CLIENT_ID` 추가
4. ✅ `npx cap sync ios` 실행
5. ✅ Xcode에서 빌드 및 테스트

완료하면 iOS 앱에서 Google 로그인 버튼을 누를 때 **앱 내부 팝업**이 나타나서 로그인할 수 있습니다! 🎉
