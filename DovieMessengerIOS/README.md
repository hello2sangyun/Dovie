# Dovie Messenger iOS

Dovie Messenger의 완전한 Swift 네이티브 iOS 애플리케이션입니다. 기존 웹 버전의 모든 기능을 네이티브 iOS 앱으로 구현했습니다.

## 주요 기능

### 🔐 인증 시스템
- 이메일/비밀번호 로그인
- 전화번호 SMS 인증
- Google OAuth 소셜 로그인
- Facebook 소셜 로그인
- 안전한 키체인 토큰 저장

### 💬 실시간 채팅
- WebSocket 기반 실시간 메시징
- 1:1 및 그룹 채팅
- 타이핑 인디케이터
- 메시지 읽음 표시
- 음성 메시지 녹음/재생
- 파일 및 이미지 전송
- YouTube 영상 미리보기
- 위치 공유

### 👥 연락처 관리
- 연락처 추가/삭제
- 즐겨찾기 기능
- 사용자 차단/해제
- QR 코드 스캔으로 친구 추가
- 온라인 상태 표시

### 🏢 비즈니스 스페이스
- 비즈니스 게시물 작성/조회
- 좋아요, 댓글, 공유 기능
- 회사 프로필 관리
- 비즈니스 네트워킹

### 📁 아카이브 시스템
- 메시지 및 파일 아카이브
- 카테고리별 분류
- 태그 기반 검색
- 스마트 필터링

### 🔔 푸시 알림
- 네이티브 iOS 푸시 알림
- 백그라운드 메시지 동기화
- 알림 배지 관리
- 사운드 및 진동 설정

## 기술 스택

- **프레임워크**: SwiftUI (iOS 15+)
- **아키텍처**: MVVM + Combine
- **네트워킹**: URLSession + Combine
- **실시간**: WebSocket (URLSessionWebSocketTask)
- **저장소**: Keychain Services
- **인증**: Google Sign-In SDK, Facebook SDK
- **푸시 알림**: UserNotifications Framework

## 프로젝트 구조

```
DovieMessengerIOS/
├── DovieMessenger/
│   ├── Models/                 # 데이터 모델
│   │   ├── User.swift
│   │   ├── ChatRoom.swift
│   │   └── BusinessModels.swift
│   ├── Views/                  # SwiftUI 뷰
│   │   ├── AuthenticationView.swift
│   │   ├── ChatsListView.swift
│   │   ├── ChatRoomView.swift
│   │   ├── ContactsView.swift
│   │   ├── SpaceView.swift
│   │   ├── ArchiveView.swift
│   │   └── SettingsView.swift
│   ├── Services/               # 비즈니스 로직
│   │   ├── AuthenticationManager.swift
│   │   ├── ChatManager.swift
│   │   ├── APIService.swift
│   │   ├── WebSocketService.swift
│   │   ├── KeychainManager.swift
│   │   └── PushNotificationManager.swift
│   ├── Utils/                  # 유틸리티
│   │   ├── Constants.swift
│   │   └── Extensions.swift
│   └── Extensions/
│       └── AppDelegate+PushNotifications.swift
└── DovieMessenger.xcodeproj/
```

## 설치 및 실행

### 1. 요구사항
- Xcode 14.0+
- iOS 15.0+
- Swift 5.7+

### 2. 의존성 설치

#### Google Sign-In SDK 설치
1. Xcode에서 File > Add Package Dependencies 선택
2. 다음 URL 추가: `https://github.com/google/GoogleSignIn-iOS`
3. 최신 버전 선택

#### Facebook SDK 설치
1. Xcode에서 File > Add Package Dependencies 선택
2. 다음 URL 추가: `https://github.com/facebook/facebook-ios-sdk`
3. 최신 버전 선택

### 3. 설정 파일 추가

#### Google OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성
2. OAuth 2.0 클라이언트 ID 생성 (iOS 앱용)
3. `GoogleService-Info.plist` 파일을 프로젝트에 추가
4. `Info.plist`에서 URL Scheme 업데이트:
```xml
<key>CFBundleURLSchemes</key>
<array>
    <string>YOUR_REVERSED_CLIENT_ID</string>
</array>
```

#### Facebook OAuth 설정
1. [Facebook 개발자 센터](https://developers.facebook.com/)에서 앱 생성
2. iOS 플랫폼 추가
3. `Info.plist`에서 Facebook 앱 ID 설정:
```xml
<key>FacebookAppID</key>
<string>YOUR_FACEBOOK_APP_ID</string>
```

### 4. 서버 연결 설정

`Constants.swift`에서 API URL 업데이트:
```swift
struct API {
    static let baseURL = "https://dovie-hello2sangyun.replit.app"
    static let websocketURL = "wss://dovie-hello2sangyun.replit.app/ws"
}
```

### 5. 프로젝트 빌드 및 실행
1. Xcode에서 `DovieMessenger.xcodeproj` 열기
2. 개발자 계정 설정 (Signing & Capabilities)
3. 시뮬레이터 또는 실제 기기에서 실행

## 주요 클래스 설명

### AuthenticationManager
사용자 인증을 담당하는 ObservableObject 클래스
- 이메일/전화번호/소셜 로그인 처리
- 토큰 관리 (키체인 저장)
- 사용자 상태 관리

### ChatManager
채팅 기능을 관리하는 중앙 클래스
- WebSocket 연결 관리
- 메시지 송수신
- 채팅방 관리
- 타이핑 상태 처리

### APIService
REST API 통신을 담당하는 싱글톤 클래스
- HTTP 요청/응답 처리
- 인증 토큰 자동 첨부
- 에러 핸들링

### WebSocketService
실시간 통신을 위한 WebSocket 관리
- 연결 상태 모니터링
- 자동 재연결
- 하트비트 처리

### PushNotificationManager
푸시 알림 시스템 관리
- 알림 권한 요청
- 디바이스 토큰 등록
- 백그라운드 알림 처리

## API 연동

서버와의 통신은 다음과 같이 구성됩니다:

### 인증 API
```
POST /api/auth/login      # 로그인
POST /api/auth/signup     # 회원가입  
POST /api/auth/google     # Google 로그인
POST /api/auth/facebook   # Facebook 로그인
GET  /api/auth/user       # 현재 사용자 정보
POST /api/auth/logout     # 로그아웃
```

### 채팅 API
```
GET  /api/chat-rooms      # 채팅방 목록
POST /api/chat-rooms      # 채팅방 생성
GET  /api/chat-rooms/:id/messages  # 메시지 조회
POST /api/upload          # 파일 업로드
```

### WebSocket 이벤트
```
message         # 새 메시지
typing          # 타이핑 상태
user_status     # 사용자 온라인 상태
join_room       # 채팅방 입장
leave_room      # 채팅방 퇴장
```

## 푸시 알림 설정

1. Apple Developer Program에서 Push Notification 인증서 생성
2. 서버에 APN 인증서 또는 키 설정
3. 앱에서 디바이스 토큰을 서버에 전송
4. 서버에서 APN을 통해 푸시 알림 전송

## 보안 고려사항

- **키체인 저장**: 인증 토큰을 안전하게 키체인에 저장
- **HTTPS 통신**: 모든 API 통신은 HTTPS로 암호화
- **WSS 연결**: WebSocket도 SSL/TLS 암호화 사용
- **토큰 갱신**: JWT 토큰의 자동 갱신 메커니즘
- **입력 검증**: 사용자 입력에 대한 클라이언트/서버 검증

## 성능 최적화

- **이미지 캐싱**: AsyncImage와 커스텀 캐시 시스템
- **메모리 관리**: WeakReference 패턴 사용
- **배터리 최적화**: 백그라운드 작업 최소화
- **네트워크 효율성**: 요청 배칭 및 압축

## 앱스토어 배포

1. **앱 아이콘 및 스크린샷** 준비
2. **App Store Connect**에서 앱 등록
3. **TestFlight**를 통한 베타 테스트
4. **App Review Guidelines** 준수 확인
5. **프라이버시 정책** 및 **이용약관** 준비

## 라이센스

이 프로젝트는 Dovie 팀의 소유이며, 상업적 사용에 대한 별도 협의가 필요합니다.

## 지원

기술적 문의나 버그 리포트는 개발팀에게 연락해주세요.