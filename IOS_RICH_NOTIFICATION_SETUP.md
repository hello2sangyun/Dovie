# iOS Rich Notification 설정 가이드

## 📱 Rich Notification이란?

iOS 푸시 알림에 **큰 이미지, 비디오, 오디오**를 첨부할 수 있는 기능입니다.

### 일반 알림 vs Rich 알림

**일반 알림 (현재)**:
```
┌─────────────────────────┐
│ 📱 Dovie (앱 아이콘)     │ ← 변경 불가
│ 새 메시지가 도착했습니다   │
└─────────────────────────┘
```

**Rich 알림 (설정 후)**:
```
┌─────────────────────────┐
│ 📱 Dovie (앱 아이콘)     │ ← 변경 불가
│ 새 메시지가 도착했습니다   │
│ ┌───────────────────┐   │
│ │                   │   │
│ │  [Dovie 로고 큰 이미지] │ ← 커스텀 이미지!
│ │                   │   │
│ └───────────────────┘   │
└─────────────────────────┘
```

---

## 🚀 설정 방법

### Step 1: Xcode 프로젝트 열기

```bash
# Git pull로 최신 코드 받기
cd ~/path/to/dovie-messenger
git pull origin main

# 프론트엔드 빌드
npm run build

# Capacitor 동기화
npx cap sync ios

# Xcode 열기
npx cap open ios
```

⚠️ **중요**: `.xcworkspace` 파일을 열어야 합니다 (`.xcodeproj`가 아님)

---

### Step 2: Notification Service Extension 추가

#### 2-1. 새 타겟 추가

1. Xcode에서 `File` → `New` → `Target...` 클릭
2. 템플릿 선택 화면에서:
   - 왼쪽: `iOS` 선택
   - 오른쪽: `Notification Service Extension` 선택
   - `Next` 클릭

#### 2-2. Extension 정보 입력

- **Product Name**: `NotificationServiceExtension` 입력
- **Team**: 본인의 Apple Developer 계정 선택
- **Language**: Swift
- **Project**: App
- **Embed in Application**: App
- `Finish` 클릭

#### 2-3. Activate Scheme 선택

- "Activate 'NotificationServiceExtension' scheme?" 팝업 → **`Cancel`** 클릭
- (앱 스킴을 유지해야 합니다)

---

### Step 3: NotificationService.swift 코드 교체

#### 3-1. 파일 찾기

Xcode 왼쪽 네비게이터에서:
- `NotificationServiceExtension` 폴더 → `NotificationService.swift` 클릭

#### 3-2. 코드 전체 교체

기존 코드를 **전부 삭제**하고, 다음 코드로 교체:

```swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        if let bestAttemptContent = bestAttemptContent {
            if let imageURLString = bestAttemptContent.userInfo["imageUrl"] as? String,
               let imageURL = URL(string: imageURLString) {
                
                downloadImage(from: imageURL) { attachment in
                    if let attachment = attachment {
                        bestAttemptContent.attachments = [attachment]
                    }
                    contentHandler(bestAttemptContent)
                }
            } else {
                contentHandler(bestAttemptContent)
            }
        }
    }
    
    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { localURL, response, error in
            guard let localURL = localURL else {
                completion(nil)
                return
            }
            
            let tempDirectory = FileManager.default.temporaryDirectory
            let uniqueName = ProcessInfo.processInfo.globallyUniqueString
            let fileExtension = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let fileURL = tempDirectory.appendingPathComponent("\(uniqueName).\(fileExtension)")
            
            do {
                try FileManager.default.moveItem(at: localURL, to: fileURL)
                let attachment = try UNNotificationAttachment(identifier: uniqueName, url: fileURL, options: nil)
                completion(attachment)
            } catch {
                print("❌ Failed to create notification attachment: \(error)")
                completion(nil)
            }
        }
        task.resume()
    }
    
    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
```

**또는** 프로젝트 루트의 `ios/NotificationService.swift` 파일 내용을 복사해서 붙여넣기

#### 3-3. 저장

- `⌘S` (Command + S) 또는 `File` → `Save`

---

### Step 4: Deployment Target 확인

#### 4-1. Extension 타겟 선택

1. Xcode 왼쪽에서 `App` 프로젝트 클릭 (최상단 파란색 아이콘)
2. `TARGETS` 섹션에서 `NotificationServiceExtension` 선택
3. `General` 탭 클릭

#### 4-2. iOS Deployment Target 확인

- **Minimum Deployments** → **iOS**: `15.0` 이상
- (App 타겟과 동일하게 설정)

---

### Step 5: 빌드 및 테스트

#### 5-1. 클린 빌드

```
Product → Clean Build Folder (⌘⇧K)
```

#### 5-2. 빌드

```
Product → Build (⌘B)
```

빌드 성공 확인:
- ✅ "Build Succeeded" 메시지
- ❌ 에러 발생 시: 아래 **문제 해결** 섹션 참고

#### 5-3. 실제 기기에서 테스트

1. iPhone을 Mac에 USB로 연결
2. Xcode 상단에서 연결된 기기 선택
3. `Product` → `Run` (⌘R)
4. 앱 설치 및 실행 확인

⚠️ **중요**: 
- Rich Notification은 **실제 기기에서만** 테스트 가능 (시뮬레이터 불가)
- 푸시 알림 권한 허용 필수

---

## 📱 서버 코드 확인

서버 코드는 **이미 자동으로 설정**되어 있습니다!

### 자동 설정된 내용

1. **기본 Dovie 로고 표시**
   - 텍스트 메시지에도 Dovie 로고가 Rich Notification으로 표시됩니다
   - `server/push-notifications.ts` 515번 줄

2. **미디어 첨부 자동 처리**
   - 이미지 메시지 → 이미지 표시
   - 비디오 메시지 → 비디오 썸네일 표시
   - 음성 메시지 → 오디오 아이콘 표시
   - `server/push-notifications.ts` 497-517번 줄

3. **APNS mutable-content 활성화**
   - Rich Notification 활성화 플래그
   - `server/push-notifications.ts` 373번 줄

---

## 🧪 테스트 방법

### 1. 푸시 알림 권한 허용

1. 앱 실행
2. 로그인
3. 푸시 알림 권한 요청 팝업 → **"허용"** 선택

### 2. 테스트 메시지 발송

다른 계정에서 메시지 보내기:
- 텍스트 메시지: Dovie 로고 이미지 표시
- 이미지 전송: 전송한 이미지 표시
- 비디오 전송: 비디오 썸네일 표시

### 3. 확인 사항

- [ ] 알림 배너에 큰 이미지 표시됨
- [ ] 알림 길게 누르기 → 큰 이미지 전체 보기
- [ ] 알림 탭 → 앱 열림 및 해당 채팅방 이동
- [ ] 이미지가 선명하게 표시됨

---

## 🐛 문제 해결

### 문제 1: 빌드 에러 - "No such module"

**원인**: CocoaPods 의존성 문제

**해결 방법**:
```bash
cd ios/App
pod deintegrate
pod cache clean --all
pod install
cd ../..
```

그 후 Xcode에서 `Product` → `Clean Build Folder` (⌘⇧K)

---

### 문제 2: Rich Notification이 표시되지 않음

**체크리스트**:
1. [ ] 실제 기기에서 테스트 중 (시뮬레이터 불가)
2. [ ] Notification Service Extension이 제대로 빌드됨
3. [ ] 앱이 백그라운드 또는 종료 상태
   - (앱이 포그라운드일 때는 Rich Notification 안 보임)
4. [ ] 푸시 알림 권한 허용됨
5. [ ] 인터넷 연결 확인 (이미지 다운로드 필요)

**디버깅 방법**:
1. Xcode에서 `Window` → `Devices and Simulators`
2. 연결된 iPhone 선택
3. `View Device Logs` 클릭
4. 푸시 알림 수신 시 로그 확인

---

### 문제 3: Extension 타겟 추가 실패

**해결 방법**:
1. Xcode 재시작
2. `File` → `New` → `Target...` 다시 시도
3. Xcode 버전 확인 (최신 버전 권장)

---

### 문제 4: 이미지 다운로드 실패

**원인**: 
- 네트워크 연결 문제
- 이미지 URL이 잘못됨
- HTTPS가 아닌 HTTP 사용 (iOS는 HTTPS만 허용)

**해결 방법**:
1. 서버 로그 확인:
   ```
   📱 Using default Dovie logo for rich notification: https://...
   ```
2. URL이 HTTPS로 시작하는지 확인
3. 브라우저에서 이미지 URL 직접 열어보기

---

## 📋 최종 체크리스트

배포 전 모든 항목 확인:

### Xcode 설정
- [ ] Notification Service Extension 타겟 추가됨
- [ ] NotificationService.swift 코드 교체 완료
- [ ] Deployment Target 15.0 이상 설정
- [ ] 빌드 성공

### 테스트
- [ ] 실제 기기에서 앱 실행됨
- [ ] 푸시 알림 권한 허용됨
- [ ] 텍스트 메시지 수신 시 Dovie 로고 표시
- [ ] 이미지 메시지 수신 시 이미지 표시
- [ ] 알림 탭 시 앱 정상 열림

### 서버
- [ ] APNS 인증서 설정됨 (Replit Secrets)
- [ ] 서버 로그에서 imageUrl 전송 확인
- [ ] mutable-content: true 설정 확인

---

## 🎉 완료!

Rich Notification 설정이 완료되었습니다!

이제 Dovie Messenger의 푸시 알림이 훨씬 더 풍부하고 시각적으로 매력적이게 됩니다:

- ✅ 텍스트 메시지: Dovie 브랜드 로고 표시
- ✅ 이미지 메시지: 실제 이미지 미리보기
- ✅ 비디오 메시지: 비디오 썸네일
- ✅ 음성 메시지: 오디오 아이콘

**다음 단계**:
1. TestFlight 베타 테스트
2. 실제 사용자 피드백 수집
3. App Store 배포

궁금한 점이 있으면 언제든지 문의해주세요! 🚀
