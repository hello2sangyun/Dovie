# Dovie Messenger iOS - 설치 가이드

이 가이드는 Dovie Messenger iOS 앱을 설치하고 설정하는 방법을 단계별로 설명합니다.

## 📋 사전 요구사항

### 개발 환경
- **macOS 12.0** 이상
- **Xcode 14.0** 이상
- **iOS 15.0** 이상 지원 기기
- **Active Apple Developer Account** (실제 기기 테스트/배포용)

### 서버 연결
- Dovie Messenger 백엔드 서버 (`https://dovie-hello2sangyun.replit.app`)
- 서버 API 접근 권한

## 🚀 설치 단계

### 1단계: 프로젝트 다운로드
```bash
# 프로젝트 폴더를 다운로드하거나 복사
cd ~/Downloads
# DovieMessengerIOS 폴더를 원하는 위치로 이동
```

### 2단계: Xcode에서 프로젝트 열기
1. **Xcode** 실행
2. **File > Open** 메뉴 선택
3. `DovieMessengerIOS/DovieMessenger.xcodeproj` 파일 선택

### 3단계: Swift Package Manager 의존성 설치
Xcode가 자동으로 Package Dependencies를 다운로드합니다. 만약 자동으로 다운로드되지 않는다면:

1. **File > Add Package Dependencies** 선택
2. 다음 패키지들을 하나씩 추가:

#### Google Sign-In SDK
```
https://github.com/google/GoogleSignIn-iOS
```
- **Version**: `7.0.0` 이상 선택
- **Target**: `DovieMessenger` 선택

#### Facebook SDK
```
https://github.com/facebook/facebook-ios-sdk
```
- **Version**: `16.0.0` 이상 선택
- **Products**: `FacebookCore`, `FacebookLogin` 선택

### 4단계: 앱 서명 설정

#### 개발용 서명
1. **Project Navigator**에서 프로젝트 선택
2. **TARGETS > DovieMessenger** 선택
3. **Signing & Capabilities** 탭 클릭
4. **Team** 드롭다운에서 개발자 계정 선택
5. **Bundle Identifier**를 고유한 값으로 변경 (예: `com.yourname.doviemessenger`)

#### 자동 관리 활성화
- **"Automatically manage signing"** 체크박스 활성화

### 5단계: 소셜 로그인 설정

#### Google OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services > Credentials** 메뉴
4. **Create Credentials > OAuth 2.0 Client IDs** 선택
5. **Application Type**: `iOS` 선택
6. **Bundle ID**: 앱의 Bundle Identifier 입력
7. 생성된 클라이언트 정보로 `GoogleService-Info.plist` 파일 다운로드
8. 다운로드한 `GoogleService-Info.plist`를 Xcode 프로젝트에 추가

#### Info.plist URL Scheme 업데이트
`Info.plist`에서 Google OAuth URL Scheme 업데이트:
```xml
<key>CFBundleURLSchemes</key>
<array>
    <string>YOUR_REVERSED_CLIENT_ID</string>
</array>
```
`YOUR_REVERSED_CLIENT_ID`는 `GoogleService-Info.plist`의 `REVERSED_CLIENT_ID` 값

#### Facebook OAuth 설정
1. [Facebook 개발자 센터](https://developers.facebook.com/) 접속
2. **My Apps > Create App** 선택
3. **Consumer** 또는 **Business** 선택
4. 앱 정보 입력 후 생성
5. **Add a Product > Facebook Login** 선택
6. **Settings > Basic**에서 iOS 플랫폼 추가
7. **Bundle ID** 입력
8. App ID를 `Info.plist`에 추가:
```xml
<key>FacebookAppID</key>
<string>YOUR_FACEBOOK_APP_ID</string>
```

### 6단계: 푸시 알림 설정

#### Apple Developer Portal 설정
1. [Apple Developer Portal](https://developer.apple.com/) 로그인
2. **Certificates, Identifiers & Profiles** 메뉴
3. **Identifiers** 섹션에서 앱 ID 찾기 또는 생성
4. **Push Notifications** capability 활성화
5. Development/Production 인증서 생성

#### Xcode에서 Capability 추가
1. **Signing & Capabilities** 탭
2. **+ Capability** 버튼 클릭
3. **Push Notifications** 추가
4. **Background Modes** 추가하고 다음 체크:
   - **Background fetch**
   - **Remote notifications**
   - **Background processing**
   - **Audio, AirPlay, and Picture in Picture**

### 7단계: 권한 설정 확인
`Info.plist`에서 다음 권한들이 설정되어 있는지 확인:

```xml
<key>NSCameraUsageDescription</key>
<string>사진을 촬영하여 메시지로 전송하기 위해 카메라 접근 권한이 필요합니다.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>사진을 선택하여 메시지로 전송하기 위해 사진 라이브러리 접근 권한이 필요합니다.</string>

<key>NSMicrophoneUsageDescription</key>
<string>음성 메시지를 녹음하기 위해 마이크 접근 권한이 필요합니다.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>위치를 공유하기 위해 위치 접근 권한이 필요합니다.</string>

<key>NSContactsUsageDescription</key>
<string>친구를 찾기 위해 연락처 접근 권한이 필요합니다.</string>
```

### 8단계: 서버 연결 설정
`Utils/Constants.swift`에서 서버 URL 확인:

```swift
struct API {
    static let baseURL = "https://dovie-hello2sangyun.replit.app"
    static let websocketURL = "wss://dovie-hello2sangyun.replit.app/ws"
}
```

서버가 다른 URL에 있다면 해당 URL로 변경하세요.

### 9단계: 빌드 및 테스트

#### 시뮬레이터에서 실행
1. **Scheme** 드롭다운에서 원하는 시뮬레이터 선택
2. **⌘ + R** 키를 눌러 빌드 및 실행
3. 앱이 성공적으로 시작되는지 확인

#### 실제 기기에서 테스트
1. USB로 iPhone/iPad 연결
2. **Scheme** 드롭다운에서 연결된 기기 선택
3. **⌘ + R** 키를 눌러 빌드 및 실행
4. 기기에서 개발자 앱 신뢰 설정 (설정 > 일반 > VPN 및 기기 관리)

## 🔧 문제 해결

### 일반적인 오류들

#### 1. "GoogleService-Info.plist not found"
- `GoogleService-Info.plist` 파일이 프로젝트에 제대로 추가되었는지 확인
- 파일이 Target Membership에 포함되어 있는지 확인

#### 2. "Signing certificate not found"
- Apple Developer 계정이 활성화되어 있는지 확인
- Xcode에서 계정 로그인 상태 확인 (**Preferences > Accounts**)
- Bundle Identifier가 고유한지 확인

#### 3. Facebook SDK 오류
- Facebook 앱 ID가 올바르게 설정되었는지 확인
- `Info.plist`의 URL Schemes가 올바른지 확인
- Facebook 앱 설정에서 iOS 플랫폼이 추가되었는지 확인

#### 4. 푸시 알림 등록 실패
- Apple Developer Portal에서 Push Notifications capability 활성화 확인
- 실제 기기에서만 테스트 (시뮬레이터는 푸시 알림 미지원)
- 네트워크 연결 상태 확인

#### 5. 서버 연결 오류
- 서버 URL이 올바른지 확인
- 네트워크 연결 상태 확인
- HTTP App Transport Security 설정 확인

### 디버깅 팁

#### 1. 콘솔 로그 확인
- Xcode **Debug Navigator** 또는 **Console** 앱 사용
- 네트워크 요청/응답 로그 확인

#### 2. 네트워크 디버깅
```swift
// URLSession에 로그 추가
URLSession.shared.configuration.protocolClasses = [URLProtocol.self]
```

#### 3. 메모리 및 성능
- Xcode **Instruments** 도구 사용
- Memory Graph Debugger 활용

## 📱 테스트 가이드

### 기능별 테스트 체크리스트

#### 인증 기능
- [ ] 이메일 로그인/회원가입
- [ ] 전화번호 SMS 인증
- [ ] Google 소셜 로그인
- [ ] Facebook 소셜 로그인
- [ ] 로그아웃

#### 채팅 기능
- [ ] 1:1 채팅 메시지 송수신
- [ ] 그룹 채팅 생성 및 참여
- [ ] 파일 및 이미지 전송
- [ ] 음성 메시지 녹음/재생
- [ ] 타이핑 인디케이터
- [ ] 메시지 읽음 표시

#### 연락처 기능
- [ ] 연락처 추가/삭제
- [ ] 즐겨찾기 설정
- [ ] 사용자 차단
- [ ] QR 코드 스캔

#### 알림 기능
- [ ] 푸시 알림 수신
- [ ] 앱 배지 업데이트
- [ ] 백그라운드 메시지 동기화

## 🚀 배포 준비

### App Store Connect 설정
1. [App Store Connect](https://appstoreconnect.apple.com/) 접속
2. **My Apps > + > New App** 선택
3. 앱 정보 입력
4. **TestFlight**을 통한 내부/외부 테스트 진행
5. App Store Review용 메타데이터 및 스크린샷 준비

### 릴리즈 빌드 설정
1. **Build Configuration**을 `Release`로 변경
2. **Archive** 빌드 생성 (**Product > Archive**)
3. **Organizer**에서 **Distribute App** 선택
4. App Store Connect에 업로드

## 📞 지원

문제가 발생하거나 도움이 필요한 경우:

1. **GitHub Issues**: 기술적 문제 보고
2. **개발팀 이메일**: 긴급한 문제나 비즈니스 관련 문의
3. **문서 확인**: `README.md` 및 코드 주석 참고

---

**참고**: 이 가이드는 Dovie Messenger iOS 1.0.0 버전 기준으로 작성되었습니다. 버전이 다른 경우 일부 단계가 다를 수 있습니다.