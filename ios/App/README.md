# Dovie Messenger iOS 앱

## Ruby 버전 오류 해결 방법

Ruby 버전 문제가 발생한 경우 다음 방법들을 시도해보세요:

### 방법 1: Homebrew로 Ruby 업데이트
```bash
# Homebrew 설치 (없는 경우)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Ruby 설치
brew install ruby

# 새 터미널 창을 열고 다시 시도
```

### 방법 2: rbenv 사용
```bash
# rbenv 설치
brew install rbenv

# Ruby 3.1.0 설치
rbenv install 3.1.0
rbenv global 3.1.0

# 셸 재시작
source ~/.zshrc
```

### 방법 3: 시스템 Ruby 사용 (sudo 필요)
```bash
sudo gem install cocoapods
```

## 설치 방법

1. 압축 해제 후 App 폴더로 이동:
   ```bash
   cd App
   ```

2. CocoaPods 의존성 설치:
   ```bash
   pod install
   ```

3. Xcode에서 열기:
   ```bash
   open App.xcworkspace
   ```

## 주의사항

- App.xcodeproj가 아닌 App.xcworkspace 파일을 열어야 합니다
- pod install 후에 App.xcworkspace 파일이 생성됩니다
- iOS 14.0 이상에서 실행됩니다

## 포함된 기능

- 실시간 채팅
- 푸시 알림
- 카메라 및 파일 시스템 접근
- 햅틱 피드백
- 상태바 제어
- 토스트 알림

## 문제 해결

Ruby 버전 오류가 계속 발생하면:
1. 새 터미널 창을 열어보세요
2. `ruby --version` 으로 버전을 확인해보세요
3. `which pod` 로 CocoaPods 설치 위치를 확인해보세요