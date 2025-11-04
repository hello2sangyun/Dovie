# 🚀 Dovie Messenger - 최종 배포 체크리스트

이 체크리스트는 Xcode 테스트와 퍼블릭 배포 전에 확인해야 할 모든 항목을 포함합니다.

---

## 📱 Xcode 테스트 (Mac에서 진행)

### 1단계: 최신 코드 가져오기

```bash
cd /Users/stanlee/Documents/Dovie
git stash
git pull
npm install
npx cap sync ios
npx cap open ios
```

### 2단계: Xcode 빌드 & 실행

1. 상단에서 **실제 iPhone** 선택 (시뮬레이터 아님)
2. **▶ 버튼** 클릭하여 빌드 & 실행
3. iPhone에서 신뢰 승인 (처음이면 필요)

### 3단계: 기능 테스트

#### ✅ **터치 감지**
- [ ] 채팅방 리스트에서 짧게 터치 → 채팅방 입장
- [ ] 채팅방 리스트에서 길게 누르기 (800ms+) → 음성 녹음 모달
- [ ] 연락처 리스트에서 짧게 터치 → 채팅방 입장
- [ ] 연락처 리스트에서 길게 누르기 → 음성 녹음 모달

#### ✅ **Safe Area (아일랜드)**
- [ ] 연락처 페이지 - "연락처" 헤더가 아일랜드에 안 가려짐
- [ ] 채팅방 페이지 - "채팅방" 헤더가 아일랜드에 안 가려짐
- [ ] 북마크 페이지 - "북마크" 헤더가 아일랜드에 안 가려짐
- [ ] 설정 페이지 - 모든 서브페이지 헤더 정상 표시
- [ ] 보라색 "Dovie Messenger" 헤더가 아일랜드 아래로 충분히 내려옴

#### ✅ **설정 페이지 디자인**
- [ ] 모든 아이콘이 보라색(purple-600)으로 통일
- [ ] 모든 카드가 흰색 배경 + 회색 테두리
- [ ] 그라데이션 배경 완전히 제거됨
- [ ] 깔끔한 중립적 디자인 유지

#### ✅ **앱 뱃지 (Badge)**
- [ ] 메시지 수신 시 앱 아이콘에 숫자 표시
- [ ] 메시지 읽으면 숫자 감소
- [ ] 로그아웃 시 뱃지 클리어

---

## 🔐 APNS 인증서 설정 (필수!)

### ⚠️ **푸시 알림 작동을 위해 반드시 필요**

#### 설정 전 상태:
```
⚠️  APNS credentials not configured. Push notifications will not work.
```

#### 설정 단계:
1. [ ] `APNS_SETUP_GUIDE.md` 파일 참고
2. [ ] Apple Developer Console에서 APNs Auth Key 생성
3. [ ] `.p8` 파일 다운로드 (한 번만 가능!)
4. [ ] Replit Secrets에 3개 추가:
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_PRIVATE_KEY`
5. [ ] Workflow 재시작
6. [ ] 서버 로그 확인: `📱 Using APNS server: api.push.apple.com`

---

## 🧪 푸시 알림 테스트 (APNS 설정 후)

### 테스트 준비
- [ ] 2개의 iPhone 또는 1개 iPhone + 1개 웹
- [ ] 각각 다른 계정으로 로그인
- [ ] 알림 권한 허용 확인

### 테스트 시나리오

#### 1. 포그라운드 (앱 열려있을 때)
- [ ] 다른 사용자가 메시지 전송
- [ ] 상단에 토스트 알림 표시
- [ ] **푸시 알림은 오지 않음** (Activity filtering)

#### 2. 백그라운드 (앱 백그라운드)
- [ ] 홈 버튼 눌러 앱 백그라운드로
- [ ] 다른 사용자가 메시지 전송
- [ ] **푸시 알림 수신**
- [ ] 앱 아이콘에 뱃지 숫자 표시
- [ ] 푸시 알림 클릭 → 해당 채팅방으로 이동

#### 3. 앱 종료 (완전히 종료)
- [ ] 앱 스와이프하여 완전 종료
- [ ] 다른 사용자가 메시지 전송
- [ ] **푸시 알림 수신**
- [ ] 푸시 클릭 → 앱 실행 & 채팅방으로 이동

#### 4. 메시지 타입별 알림
- [ ] 텍스트 메시지: 메시지 내용 표시
- [ ] 음성 메시지: "음성 메시지를 보냈습니다"
- [ ] 파일: "파일을 보냈습니다"
- [ ] YouTube: "YouTube 동영상을 공유했습니다"

---

## 🌍 퍼블릭 배포 준비

### 1. 환경 변수 확인

#### 필수 (Production)
- [ ] `APNS_KEY_ID` ✅
- [ ] `APNS_TEAM_ID` ✅
- [ ] `APNS_PRIVATE_KEY` ✅
- [ ] `FIREBASE_PROJECT_ID` ✅
- [ ] `FIREBASE_PRIVATE_KEY` ✅
- [ ] `FIREBASE_CLIENT_EMAIL` ✅
- [ ] `OPENAI_API_KEY` ✅
- [ ] `VAPID_PUBLIC_KEY` ✅
- [ ] `VAPID_PRIVATE_KEY` ✅

#### 선택적
- [ ] `VAPID_EMAIL` (기본값: mailto:admin@dovie.com)
- [ ] `TWILIO_*` (SMS 인증 사용 시)

### 2. 프로덕션 모드 확인

#### Replit Secrets 설정:
- [ ] `NODE_ENV`를 설정하지 **않음** (프로덕션 기본)
- 또는 `NODE_ENV=production` 명시적 설정

#### 서버 로그 확인:
```
📱 Using APNS server: api.push.apple.com (production)
```

**development로 표시되면 안 됨!**

### 3. Activity Filtering 확인

#### 정상 동작:
- 앱이 열려있을 때: 푸시 안 감, 토스트만 표시
- 앱 백그라운드: 푸시 수신
- 최근 2분 이내 활동 시: 푸시 생략

#### 로그 확인:
```
🚫 Skipping push notification for user X: currently active/online
```

---

## 📤 Replit 퍼블릭 배포

### 1. 배포 준비
- [ ] 모든 workflow가 정상 실행 중
- [ ] Database Setup 완료
- [ ] Start application 정상 작동
- [ ] 로그에 에러 없음

### 2. 배포 실행
- [ ] Replit 좌측 메뉴에서 **Deploy** 클릭
- [ ] **Publish** 버튼 클릭
- [ ] 배포 URL 확인: `https://dovie-hello2sangyun.replit.app`

### 3. 배포 후 검증
- [ ] 배포된 URL로 접속
- [ ] 로그인 테스트
- [ ] 메시지 전송 테스트
- [ ] WebSocket 연결 확인
- [ ] 푸시 알림 정상 작동 (백엔드에서)

---

## 🍎 App Store 제출 준비

### Xcode 프로젝트 설정
- [ ] Bundle Identifier 확인: `com.dovie.messenger`
- [ ] Version & Build Number 업데이트
- [ ] App Icons 모든 사이즈 추가
- [ ] Launch Screen 설정
- [ ] Privacy - Microphone Usage Description 추가
- [ ] Privacy - Notifications Usage Description 추가

### Capacitor 설정 확인
- [ ] `capacitor.config.ts`에서 `appId` 확인
- [ ] `server.url`이 프로덕션 URL로 설정
- [ ] iOS 설정 확인 (Info.plist)

### 필수 스크린샷
- [ ] 6.7" iPhone (iPhone 14 Pro Max)
- [ ] 6.5" iPhone
- [ ] 5.5" iPhone (선택)

### App Store Connect
- [ ] 앱 정보 입력
- [ ] 스크린샷 업로드
- [ ] 앱 설명 작성
- [ ] 카테고리 선택: Social Networking
- [ ] 연령 등급 설정
- [ ] 개인정보 처리방침 URL

---

## ✅ 최종 체크리스트

### 코드
- [x] 터치 감지 개선 (짧게/길게 구분)
- [x] Safe Area 적용 (모든 페이지)
- [x] 설정 페이지 디자인 통일
- [x] Activity filtering 활성화
- [x] APNS JWT 인증 구현
- [x] 프로덕션/개발 모드 분리

### 문서
- [x] `APNS_SETUP_GUIDE.md` 작성
- [x] `replit.md` 업데이트
- [x] `DEPLOYMENT_CHECKLIST.md` (현재 문서)
- [x] 환경 변수 문서화

### 배포
- [ ] APNS 인증서 설정
- [ ] Xcode 테스트 완료
- [ ] 푸시 알림 테스트 완료
- [ ] Replit 퍼블릭 배포
- [ ] 프로덕션 환경에서 최종 검증
- [ ] App Store 제출

---

## 🆘 문제 해결

### 푸시가 안 오는 경우
1. APNS 인증서가 제대로 설정되었는지 확인
2. 서버 로그에서 APNS 응답 코드 확인
3. iPhone 설정 → 알림 → Dovie → 알림 허용 확인
4. 앱이 백그라운드에 있는지 확인 (포그라운드에서는 토스트만)

### 뱃지가 안 업데이트되는 경우
1. `/api/unread-counts` API 정상 응답 확인
2. 브라우저 콘솔에서 뱃지 업데이트 로그 확인
3. `navigator.setAppBadge` API 지원 확인

### Safe Area 문제
1. `env(safe-area-inset-top)` CSS 적용 확인
2. iOS 버전 12+ 확인
3. Capacitor 최신 버전 확인

---

**모든 항목을 체크한 후 배포를 진행하세요!** 🎉
