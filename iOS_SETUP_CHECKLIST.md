# 🎯 iOS Google 로그인 설정 체크리스트

iOS 앱에서 Google 로그인 팝업이 작동하도록 설정하는 간단한 3단계 가이드입니다.

---

## ✅ 1단계: Firebase Console에서 iOS 앱 추가 (3분)

### 작업
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 → **iOS 아이콘**(+) 클릭
3. 번들 ID 입력: `com.dovie.messenger`
4. **GoogleService-Info.plist 다운로드** 클릭
5. 안전한 곳에 저장

### 완료 확인
- [ ] `GoogleService-Info.plist` 파일 다운로드 완료

---

## ✅ 2단계: Xcode에서 설정 파일 추가 (5분)

### 2-1. Xcode 프로젝트 열기
```bash
cd ios
open App/App.xcworkspace
```

⚠️ **주의**: `App.xcworkspace`를 열어야 합니다 (`.xcodeproj` 아님!)

### 2-2. GoogleService-Info.plist 추가

**방법**:
1. Xcode 왼쪽 네비게이터에서 **App/App** 폴더 선택
2. 다운로드한 `GoogleService-Info.plist` 파일을 **App/App 폴더로 드래그**

**중요! 팝업창에서 다음 설정**:
- ✅ **"Copy items if needed"** 체크
- ✅ **"Create groups"** 선택
- ✅ **"Add to targets: App"** 체크
- **Finish** 클릭

### 완료 확인
- [ ] `GoogleService-Info.plist` 파일이 Xcode에서 **App/App** 폴더 안에 보임
- [ ] File Inspector (⌥⌘1)에서 **Target Membership → App** 체크되어 있음

---

## ✅ 3단계: URL Schemes 설정 (2분)

### 3-1. REVERSED_CLIENT_ID 값 찾기

1. Xcode에서 `GoogleService-Info.plist` 파일 클릭
2. `REVERSED_CLIENT_ID` 키 찾기
3. 오른쪽 값 복사 (예: `com.googleusercontent.apps.123456789-abcdefg`)

### 3-2. URL Schemes 추가

1. Xcode → App 타겟 선택 → **Info 탭** 클릭
2. **URL Types** 섹션 찾기 (맨 아래)
3. **+ 버튼** 클릭
4. 다음 입력:
   - **URL Schemes**: 복사한 `REVERSED_CLIENT_ID` 값 붙여넣기
   - **Identifier**: `GoogleSignIn` 입력
   - **Role**: `Editor` (기본값)

### 완료 확인
- [ ] URL Types에 Google 로그인용 URL Scheme 추가됨
- [ ] URL Schemes 필드에 `com.googleusercontent.apps...` 값이 있음

---

## ✅ 4단계: 빌드 및 테스트 (1분)

### 빌드
1. Xcode → **Product → Clean Build Folder** (⇧⌘K)
2. **Product → Run** (⌘R)

### 테스트
1. 앱이 시뮬레이터/디바이스에서 실행됨
2. 로그인 페이지로 이동
3. **Google 로그인** 버튼 클릭
4. ✅ **앱 내부에서 Google 로그인 팝업이 나타남** (Safari 안 열림!)

### 완료 확인
- [ ] 앱 빌드 성공
- [ ] Google 로그인 버튼 클릭 시 앱 내부 팝업 나타남
- [ ] 로그인 완료 후 앱에 정상 진입

---

## 🐛 문제 해결

### "UNIMPLEMENTED" 에러가 계속 나타남

**원인**: GoogleService-Info.plist 파일이 제대로 추가되지 않음

**해결**:
1. Xcode에서 `GoogleService-Info.plist` 삭제
2. 파일을 다시 드래그할 때 **"Copy items if needed"** 체크 확인
3. **"Add to targets: App"** 체크 확인
4. Clean Build Folder 후 재빌드

### Google 로그인 후 앱으로 돌아오지 않음

**원인**: URL Schemes 설정 오류

**해결**:
1. URL Schemes 값이 `GoogleService-Info.plist`의 `REVERSED_CLIENT_ID`와 정확히 일치하는지 확인
2. 공백, 오타 없는지 재확인

### "Build input file cannot be found" 에러

**원인**: 파일 경로 문제

**해결**:
1. Xcode에서 `GoogleService-Info.plist` 파일 선택
2. File Inspector (⌥⌘1) 열기
3. **Location** 확인 → **Relative to Group**으로 설정
4. **Full Path**가 `.../ios/App/App/GoogleService-Info.plist`인지 확인

---

## 📚 자세한 설명

더 자세한 단계별 설명과 스크린샷은 `FIREBASE_IOS_SETUP.md` 파일을 참고하세요.

---

## 🎉 완료!

모든 체크박스를 체크하셨다면, iOS 앱에서 Google 로그인이 **앱 내부 팝업**으로 완벽하게 작동합니다!

Safari로 리디렉션되지 않고, 빠르고 안전하게 로그인할 수 있어요. 🚀
