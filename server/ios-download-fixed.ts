import express from 'express';
import path from 'path';
import fs from 'fs';

export const iosDownloadFixedRouter = express.Router();

iosDownloadFixedRouter.get('/ios-download-fixed', (req, res) => {
  const downloadPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>수정된 Dovie Messenger iOS 프로젝트 다운로드</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.2em;
        }
        .download-section {
            background: #f8f9ff;
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
            border: 2px solid #e1e8ff;
        }
        .download-btn {
            display: inline-block;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px 5px;
            transition: transform 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .file-info {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #2196f3;
        }
        .instructions {
            background: #fff3cd;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border: 1px solid #ffeaa7;
        }
        .step {
            margin: 15px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        .highlight {
            color: #d63384;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛠️ 수정된 Dovie Messenger iOS</h1>
        
        <div class="download-section">
            <h3>📦 최종 수정 버전</h3>
            <div class="file-info">
                <strong>파일명:</strong> dovie-messenger-ios-fixed.zip<br>
                <strong>크기:</strong> 약 180KB<br>
                <strong>수정사항:</strong> 모든 빌드 오류 해결, Capacitor 재구성
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="/ios-fixed-download" class="download-btn" id="downloadBtn">
                    📱 수정된 iOS 프로젝트 다운로드
                </a>
            </div>
        </div>

        <div class="instructions">
            <h3>🚀 설치 방법</h3>
            
            <div class="step">
                <strong>1. 압축 해제</strong><br>
                다운로드된 ZIP 파일을 더블클릭하여 압축 해제
            </div>
            
            <div class="step">
                <strong>2. CocoaPods 설치</strong> (필요한 경우)<br>
                <code>sudo gem install cocoapods</code>
            </div>
            
            <div class="step">
                <strong>3. 의존성 설치</strong><br>
                <code>cd ios/App</code><br>
                <code>pod install</code>
            </div>
            
            <div class="step">
                <strong>4. Xcode에서 열기</strong><br>
                <code>open App.xcworkspace</code><br>
                <span class="highlight">중요: .xcworkspace 파일을 열어야 합니다</span>
            </div>
            
            <div class="step">
                <strong>5. 앱 실행</strong><br>
                시뮬레이터 선택 후 <strong>⌘ + R</strong>로 실행
            </div>
        </div>

        <div class="file-info">
            <strong>✅ 해결된 문제들:</strong><br>
            • UserNotifications 프레임워크 추가<br>
            • @UIApplicationMain 어노테이션 오류 수정<br>
            • Capacitor 프로젝트 구조 재생성<br>
            • 모든 빌드 설정 오류 해결
        </div>
    </div>

    <script>
        document.getElementById('downloadBtn').addEventListener('click', function() {
            this.innerHTML = '⬇️ 다운로드 중...';
            setTimeout(() => {
                this.innerHTML = '✅ 다운로드 완료!';
            }, 2000);
        });
    </script>
</body>
</html>`;
  
  res.send(downloadPage);
});

iosDownloadFixedRouter.get('/ios-fixed-download', (req, res) => {
  const filePath = path.join(process.cwd(), 'ios', 'dovie-messenger-ios-fixed.zip');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'dovie-messenger-ios-fixed.zip', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).send('다운로드 중 오류가 발생했습니다.');
      }
    });
  } else {
    res.status(404).send('파일을 찾을 수 없습니다.');
  }
});