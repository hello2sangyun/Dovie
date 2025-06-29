# Dovie Messenger iOS 앱

## 📱 설치 가이드

### 1단계: Xcode 설치 확인
- macOS에서 App Store를 통해 Xcode를 설치하세요
- Xcode Command Line Tools가 필요합니다:
```bash
sudo xcode-select --install
```

### 2단계: CocoaPods 설치
```bash
sudo gem install cocoapods
```

**Ruby 버전 문제가 있는 경우:**
```bash
# Homebrew로 최신 Ruby 설치
brew install ruby

# 새 터미널에서 CocoaPods 설치
sudo gem install cocoapods
```

### 3단계: 프로젝트 설정
```bash
# 다운로드받은 폴더로 이동
cd /다운로드경로/dovie-messenger-ios-fixed

# iOS 폴더로 이동
cd ios/App

# CocoaPods 종속성 설치
pod install
```

### 4단계: Xcode에서 실행
```bash
# Xcode 워크스페이스 열기 (중요: .xcworkspace 파일을 열어야 함!)
open App.xcworkspace
```

### 5단계: 시뮬레이터에서 실행
1. Xcode가 열리면 상단에서 시뮬레이터 선택 (예: iPhone 15)
2. ⌘+R 키를 누르거나 재생 버튼 클릭
3. 앱이 시뮬레이터에서 실행됩니다

## 🔧 문제 해결

### CocoaPods 오류
```bash
# Pod 캐시 정리
pod repo update
pod install --repo-update
```

### Xcode 빌드 오류
- Product → Clean Build Folder (⌘+Shift+K)
- 프로젝트 재빌드

### Ruby 권한 오류
```bash
# rbenv 사용 (권장)
brew install rbenv
rbenv install 3.1.0
rbenv global 3.1.0
```

## ✨ 앱 기능
- 실시간 채팅
- 음성 메시지
- 파일 공유
- 푸시 알림 (네이티브 iOS)
- 카메라 및 사진 라이브러리 접근
- 햅틱 피드백
- 상태바 제어

## 📋 요구사항
- macOS Monterey 12.0+
- Xcode 14.0+
- iOS 14.0+ (시뮬레이터 또는 실제 기기)
- CocoaPods 1.11.0+