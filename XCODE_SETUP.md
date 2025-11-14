# Xcode CallKit 설정 가이드

## ⚠️ 현재 문제
```
❌ [CallKitService] Initialization failed: {"code":"UNIMPLEMENTED"}
❌ APNS 토큰 등록 실패: no valid "aps-environment" entitlement string found for application
```

## 🛠️ 해결 방법

### 1단계: Xcode 프로젝트 열기
```bash
cd ios/App
open App.xcworkspace
```

### 2단계: CallKit 플러그인 파일 타겟 포함 확인

1. **왼쪽 Navigator에서 `CallKitVoipPlugin.swift` 찾기**
   - `App` 폴더 → `CallKitVoipPlugin.swift`

2. **파일 선택 후 오른쪽 Inspector 확인**
   - Target Membership 섹션에서 `App` 체크박스가 선택되어 있는지 확인
   - 선택되어 있지 않다면 체크 ✅

### 3단계: Signing & Capabilities 설정

1. **프로젝트 네비게이터에서 `App` (최상단 파란 아이콘) 클릭**
2. **TARGETS → App 선택**
3. **Signing & Capabilities 탭**

#### A. Automatic Signing 활성화
- ✅ Automatically manage signing 체크
- Team 선택 (Apple Developer Account)
- Bundle Identifier: `com.dovie.messenger` 확인

#### B. Push Notifications Capability 추가
- `+ Capability` 버튼 클릭
- "Push Notifications" 검색 후 추가
- 자동으로 entitlement 파일에 추가됨

#### C. Background Modes 확인
- Background Modes가 이미 있는지 확인
- 없으면 `+ Capability` → "Background Modes" 추가
- 다음 항목 체크:
  - ✅ Voice over IP
  - ✅ Remote notifications

### 4단계: Entitlements 파일 확인

1. **App.entitlements 파일 열기**
2. **다음 내용이 있는지 확인:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>development</string>
</dict>
</plist>
```

3. **만약 `aps-environment`가 없다면:**
   - Xcode 메뉴: Editor → Add Key
   - `aps-environment` 입력
   - Type: String
   - Value: `development`

### 5단계: Info.plist 확인

`UIBackgroundModes` 배열에 다음이 포함되어 있는지 확인:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>voip</string>
</array>
```

### 6단계: Clean Build & 재빌드

1. **Product → Clean Build Folder** (⌘+Shift+K)
2. **Product → Build** (⌘+B)
3. 에러가 없는지 확인

### 7단계: 실제 디바이스에 설치

1. **iPhone을 Mac에 USB로 연결**
2. **상단 타겟 선택 메뉴에서 실제 디바이스 선택**
   - "Any iOS Device" 대신 "Your iPhone Name" 선택
3. **▶️ Run 버튼 클릭** (⌘+R)

### 8단계: 콘솔 로그 확인

앱 실행 후 다음 로그가 나타나야 합니다:

```
✅ [CallKit] Plugin loaded
✅ [CallKit] CallKit and PushKit initialized
✅ [CallKitService] Initialized
📞 [CallKit] VoIP token received: ...
```

**에러가 사라져야 합니다:**
```
❌ [CallKitService] Initialization failed: {"code":"UNIMPLEMENTED"} ← 사라짐
❌ APNS 토큰 등록 실패 ← 사라짐
```

## 🧪 테스트 방법

앱이 설치되면:

1. **다른 사용자 계정으로 전화 걸기**
2. **iPhone에 CallKit UI가 나타나는지 확인**
   - 네이티브 전화 화면 (초록색 "받기" 버튼)
3. **"받기" 버튼 탭**
4. **통화 연결 확인**

## 🔍 문제 해결

### CallKit 플러그인이 여전히 로드되지 않는 경우

**방법 1: Capacitor 재동기화**
```bash
cd /path/to/project
npx cap sync ios
npx cap open ios
```

**방법 2: 파일 재추가**
1. Xcode에서 `CallKitVoipPlugin.swift` 삭제 (Move to Trash)
2. Finder에서 `ios/App/App/CallKitVoipPlugin.swift` 파일을 Xcode 프로젝트로 드래그
3. "Copy items if needed" 체크
4. "Add to targets: App" 체크
5. Finish

### APNS 토큰이 여전히 실패하는 경우

1. **Apple Developer Portal 확인**
   - Certificates, Identifiers & Profiles
   - Identifiers → `com.dovie.messenger`
   - Push Notifications capability 활성화 확인

2. **Provisioning Profile 재생성**
   - Xcode → Preferences → Accounts
   - Apple ID 선택 → Download Manual Profiles
   - 프로젝트 다시 빌드

## 📱 Production 배포 시

`App.entitlements`에서 환경 변경:
```xml
<key>aps-environment</key>
<string>production</string>  <!-- development → production -->
```

## ✅ 성공 확인

다음이 모두 나타나면 성공:
- ✅ CallKit 플러그인 로드 로그
- ✅ VoIP 토큰 수신 로그
- ✅ APNS 토큰 등록 성공
- ✅ 전화 걸 때 CallKit UI 표시
- ✅ VoIP push로 앱이 깨어나고 CallKit UI 표시
