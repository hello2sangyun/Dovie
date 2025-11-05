# iOS 스플래시 스크린 설정 가이드

## ✅ 완료된 작업
- ✅ 스플래시 시간 단축: 3초 → 1초
- ✅ 배경색 변경: 보라색 → 흰색 (깔끔한 디자인)
- ✅ 로딩 스피너 제거: 더 깔끔한 화면

## 📱 맥북에서 스플래시 이미지 설정하기

### 방법 1: Xcode에서 직접 설정 (간단)

1. **Xcode 열기**
   ```bash
   cd /Users/stanlee/Downloads/Dovie
   npx cap open ios
   ```

2. **스플래시 이미지 추가**
   - Xcode 좌측에서 `App` → `Assets.xcassets` 클릭
   - `Splash` 폴더 찾기
   - Dovie 로고 이미지를 드래그 앤 드롭
   - 권장 크기: 2732x2732px

3. **빌드 & 실행**
   - Xcode Run 버튼 (▶️) 클릭
   - 스플래시 화면이 1초만 표시됨 ✅

---

### 방법 2: Capacitor Assets 자동 생성 (고급)

1. **프로젝트 루트에 assets 폴더 생성**
   ```bash
   cd /Users/stanlee/Downloads/Dovie
   mkdir -p assets
   ```

2. **스플래시 이미지 저장**
   - Dovie 로고 이미지를 `assets/splash.png`로 저장
   - 권장 크기: 2732x2732px

3. **Capacitor Assets 플러그인 설치**
   ```bash
   npm install @capacitor/assets --save-dev
   ```

4. **자동 생성**
   ```bash
   npx capacitor-assets generate
   ```

5. **iOS 동기화**
   ```bash
   npx cap sync ios
   npx cap open ios
   ```

---

## 🎨 현재 설정값

```typescript
SplashScreen: {
  launchShowDuration: 1000,      // 1초만 표시 ✅
  backgroundColor: '#FFFFFF',     // 흰색 배경 ✅
  showSpinner: false,            // 로딩 스피너 없음 ✅
}
```

---

## 💡 팁

- 스플래시 화면이 1초만 표시되므로 앱 시작이 훨씬 빨라졌습니다!
- 로딩 스피너를 제거하여 더 깔끔한 디자인이 됩니다
- Dovie 로고가 중앙에 깔끔하게 표시됩니다

---

## 🚀 다음 단계

맥북 터미널에서:
```bash
cd /Users/stanlee/Downloads/Dovie
git pull                    # Replit 최신 변경사항 받기
npx cap sync ios           # iOS 프로젝트 동기화
npx cap open ios           # Xcode 열기
```

Xcode에서 Run 버튼 누르면 **새로운 빠른 스플래시 화면**을 볼 수 있습니다! 🎉
