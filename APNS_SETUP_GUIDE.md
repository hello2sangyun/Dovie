# 🍎 Apple Push Notification Service (APNS) 설정 가이드

이 가이드는 Dovie Messenger iOS 앱에서 푸시 알림을 사용하기 위한 APNS 인증서 설정 방법을 안내합니다.

## 📋 필수 사항

- Apple Developer Program 계정 (연간 $99)
- Mac 컴퓨터 (Xcode 사용)
- Dovie Messenger iOS 앱이 빌드된 상태

---

## 🔑 1단계: APNs Auth Key 생성

### 1. Apple Developer Console 접속

1. [Apple Developer Console](https://developer.apple.com/account/)에 로그인
2. 좌측 메뉴에서 **"Certificates, Identifiers & Profiles"** 클릭
3. **"Keys"** 선택

### 2. 새 키 생성

1. **"+"** 버튼 클릭 (Create a New Key)
2. **Key Name** 입력 (예: "Dovie Messenger Push Key")
3. **Apple Push Notifications service (APNs)** 체크
4. **Continue** 클릭
5. **Register** 클릭

### 3. 키 다운로드 ⚠️ 중요!

1. **Download** 버튼 클릭하여 `.p8` 파일 다운로드
2. **Key ID** 복사 및 저장 (예: `ABC123DEF4`)
   - 이것이 `APNS_KEY_ID`입니다
3. ⚠️ **주의**: 이 파일은 한 번만 다운로드 가능합니다. 안전하게 보관하세요!
4. **Done** 클릭

---

## 👥 2단계: Team ID 확인

1. Apple Developer Console 상단에서 **"Membership"** 클릭
2. **Team ID** 확인 및 복사 (예: `A1B2C3D4E5`)
   - 이것이 `APNS_TEAM_ID`입니다

---

## 📄 3단계: Private Key 추출

다운로드한 `.p8` 파일의 내용을 확인합니다:

### Mac/Linux:
```bash
cat ~/Downloads/AuthKey_ABC123DEF4.p8
```

### 결과 예시:
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(여러 줄의 긴 문자열)
...XYZ123ABC
-----END PRIVATE KEY-----
```

**전체 내용을 복사**하세요 (BEGIN부터 END까지 모두 포함)
- 이것이 `APNS_PRIVATE_KEY`입니다

---

## 🔧 4단계: Replit Secrets 설정

### Replit에서 환경 변수 추가:

1. Replit 프로젝트 열기
2. 좌측 **Tools** → **Secrets** 클릭
3. 다음 3개 Secret 추가:

#### `APNS_KEY_ID`
- **Value**: 2단계에서 복사한 Key ID
- 예: `ABC123DEF4`

#### `APNS_TEAM_ID`
- **Value**: 3단계에서 복사한 Team ID
- 예: `A1B2C3D4E5`

#### `APNS_PRIVATE_KEY`
- **Value**: 4단계에서 복사한 전체 Private Key
- ⚠️ **중요**: 줄바꿈을 `\n`으로 변환해야 합니다

**변환 방법** (Mac/Linux):
```bash
cat ~/Downloads/AuthKey_ABC123DEF4.p8 | tr '\n' '|' | sed 's/|/\\n/g'
```

**결과 예시**:
```
-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n...XYZ123ABC\n-----END PRIVATE KEY-----
```

이것을 `APNS_PRIVATE_KEY` Secret에 붙여넣기하세요.

---

## ✅ 5단계: 설정 확인

### 1. Workflow 재시작

Replit에서 **Start application** workflow를 재시작하세요.

### 2. 로그 확인

서버 시작 시 다음 메시지가 **나타나지 않으면** 성공:
```
⚠️  APNS credentials not configured. Push notifications will not work.
```

**정상 동작 시**:
```
📱 Using APNS server: api.push.apple.com (production)
```

### 3. 푸시 테스트

1. Xcode로 iOS 앱을 실제 iPhone에서 실행
2. 다른 사용자로 로그인한 두 번째 기기에서 메시지 전송
3. 첫 번째 기기에서 푸시 알림 수신 확인

---

## 🌍 프로덕션 vs 개발 모드

### 프로덕션 모드 (기본값)
- APNS 서버: `api.push.apple.com`
- 앱스토어 배포용 빌드에서 작동
- Activity filtering 활성화 (앱 열려있을 때 푸시 안 감)

### 개발 모드
Replit Secrets에 `NODE_ENV=development` 추가 시:
- APNS 서버: `api.development.push.apple.com`
- Xcode 개발 빌드에서 테스트용
- 모든 푸시 알림 전송 (테스트 편의)

---

## 🔍 문제 해결

### "APNS credentials not configured" 경고가 계속 나타남
- Secrets가 정확히 설정되었는지 확인
- Workflow를 재시작했는지 확인
- Secret 이름 철자 확인: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`

### 푸시가 전송되지 않음
- iOS 기기에서 알림 권한 허용되었는지 확인
- 앱이 백그라운드에 있는지 확인 (포그라운드에서는 토스트로 표시)
- 서버 로그에서 APNS 응답 코드 확인:
  - `200`: 성공
  - `400`: 잘못된 요청
  - `403`: 인증 실패 (인증서 확인)
  - `410`: 디바이스 토큰 만료

### Private Key 형식 오류
- `\n`으로 줄바꿈이 제대로 변환되었는지 확인
- BEGIN/END 줄 포함 여부 확인
- 불필요한 공백이나 문자 없는지 확인

---

## 📚 추가 참고자료

- [Apple Developer Documentation - APNs](https://developer.apple.com/documentation/usernotifications)
- [Generating APNs Tokens](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_token-based_connection_to_apns)

---

## ⚠️ 보안 주의사항

1. `.p8` 파일은 절대 Git에 커밋하지 마세요
2. Private Key는 안전한 곳에 백업하세요
3. Key가 유출되면 즉시 무효화하고 새로 생성하세요
4. Replit Secrets는 암호화되어 저장됩니다

---

**설정 완료 후 퍼블릭 배포를 진행하세요!** 🚀
