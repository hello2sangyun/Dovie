# Dovie Messenger iOS 앱 설치 가이드

## 시스템 요구사항

- macOS (Monterey 12.0 이상 권장)
- Xcode 14.0 이상
- CocoaPods 설치 필요
- Ruby 2.7 이상

## Ruby 및 CocoaPods 설치

### 방법 1: Homebrew를 이용한 설치 (권장)

```bash
# Homebrew가 없다면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Ruby 설치
brew install ruby

# CocoaPods 설치
sudo gem install cocoapods
```

### 방법 2: rbenv를 이용한 Ruby 버전 관리

```bash
# rbenv 설치
brew install rbenv

# 최신 Ruby 설치
rbenv install 3.2.0
rbenv global 3.2.0

# 환경변수 설정
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc

# CocoaPods 설치
gem install cocoapods
```

### 방법 3: 시스템 Ruby 사용 (macOS 기본)

```bash
# 시스템 Ruby로 CocoaPods 설치
sudo gem install cocoapods

# 권한 문제가 있다면 다음 명령어 사용
sudo gem install cocoapods --user-install
```

## iOS 프로젝트 설치 및 실행

### 1. 프로젝트 다운로드 및 압축 해제

다운로드받은 `dovie-messenger-ios.zip` 파일을 압축 해제합니다.

### 2. 터미널에서 프로젝트 폴더로 이동

```bash
cd /path/to/dovie-messenger-ios
cd ios/App
```

### 3. CocoaPods 종속성 설치

```bash
pod install
```

만약 오류가 발생한다면:

```bash
# Podfile.lock 삭제 후 재시도
rm Podfile.lock
pod install

# 또는 CocoaPods 캐시 정리
pod cache clean --all
pod install
```

### 4. Xcode에서 프로젝트 열기

**중요**: `.xcodeproj` 파일이 아닌 `.xcworkspace` 파일을 열어야 합니다.

```bash
open App.xcworkspace
```

또는 Finder에서 `App.xcworkspace` 파일을 더블클릭합니다.

### 5. 시뮬레이터에서 실행

1. Xcode에서 상단의 디바이스 선택기에서 iOS 시뮬레이터 선택 (예: iPhone 14 Pro)
2. ⌘ + R 키를 누르거나 재생 버튼(▶️) 클릭
3. 앱이 시뮬레이터에서 실행됩니다

## 문제 해결

### Ruby 버전 오류

```bash
# 현재 Ruby 버전 확인
ruby --version

# 2.7 미만이라면 업데이트 필요
brew upgrade ruby
```

### CocoaPods 설치 실패

```bash
# Xcode Command Line Tools 설치
xcode-select --install

# 다시 CocoaPods 설치 시도
sudo gem install cocoapods
```

### pod install 실패

```bash
# CocoaPods 업데이트
sudo gem update cocoapods

# 캐시 정리
pod cache clean --all
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 다시 시도
pod install
```

### Xcode 빌드 오류

1. Product → Clean Build Folder (⇧⌘K)
2. 프로젝트 재빌드
3. 여전히 문제가 있다면 시뮬레이터 재시작

## 앱 기능

- 🚀 실시간 채팅 시스템
- 🔔 네이티브 푸시 알림
- 🎤 음성 메시지 (AI 텍스트 변환)
- 📁 암호화된 파일 공유
- 📱 완전한 네이티브 iOS 앱 경험

## 지원 및 문의

설치 중 문제가 발생하면 위의 문제 해결 단계를 먼저 시도해 보세요. 그래도 해결되지 않으면 다음을 확인하세요:

- Xcode가 최신 버전인지 확인
- macOS가 지원되는 버전인지 확인
- 인터넷 연결이 안정적인지 확인