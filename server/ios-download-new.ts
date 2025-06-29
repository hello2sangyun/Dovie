import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const iosDownloadNewHandler = (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), 'ios-temp', 'dovie-messenger-ios-fixed.zip');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>파일을 찾을 수 없음</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            min-height: 100vh; 
            margin: 0;
          }
          .container { 
            background: rgba(255,255,255,0.1); 
            padding: 40px; 
            border-radius: 20px; 
            backdrop-filter: blur(10px); 
            max-width: 600px; 
            margin: 0 auto; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ 파일을 찾을 수 없습니다</h1>
          <p>iOS 프로젝트 파일이 아직 준비되지 않았습니다.</p>
          <p>잠시 후 다시 시도해 주세요.</p>
        </div>
      </body>
      </html>
    `);
  }

  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = Math.round(fileSizeInBytes / 1024);

  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dovie Messenger iOS 다운로드</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          line-height: 1.6;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px;
          max-width: 700px;
          width: 90%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .file-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .download-btn {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: center;
          margin-bottom: 24px;
        }
        .download-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(79, 70, 229, 0.4);
        }
        .instructions {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          margin-top: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .instructions h3 {
          font-size: 1.3rem;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step {
          margin-bottom: 16px;
          padding-left: 24px;
          position: relative;
        }
        .step::before {
          content: counter(step-counter);
          counter-increment: step-counter;
          position: absolute;
          left: 0;
          top: 0;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .code {
          background: rgba(0, 0, 0, 0.3);
          padding: 12px 16px;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9rem;
          margin: 8px 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .warning {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .feature {
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .feature-icon {
          font-size: 2rem;
          margin-bottom: 8px;
          display: block;
        }
        ol {
          counter-reset: step-counter;
          list-style: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📱 Dovie Messenger iOS</h1>
          <p>네이티브 iOS 앱 프로젝트</p>
          <p><strong>파일 크기:</strong> ${fileSizeInKB}KB</p>
        </div>

        <div class="file-info">
          <h3>🔧 프로젝트 정보</h3>
          <p>• <strong>플랫폼:</strong> iOS 14.0+</p>
          <p>• <strong>개발 도구:</strong> Xcode 14.0+</p>
          <p>• <strong>프레임워크:</strong> Capacitor 7.x</p>
          <p>• <strong>언어:</strong> Swift 5.0+</p>
        </div>

        <a href="/api/ios-file-new" class="download-btn">
          ⬇️ 다운로드 시작
        </a>

        <div class="instructions">
          <h3>🚀 설치 가이드</h3>
          <ol>
            <li class="step">
              <strong>Xcode 설치 확인</strong><br>
              App Store에서 Xcode 최신 버전을 설치하세요.
            </li>
            <li class="step">
              <strong>Command Line Tools 설치</strong>
              <div class="code">sudo xcode-select --install</div>
            </li>
            <li class="step">
              <strong>CocoaPods 설치</strong>
              <div class="code">sudo gem install cocoapods</div>
              <div class="warning">
                <strong>⚠️ Ruby 버전 문제 시:</strong><br>
                • Homebrew로 최신 Ruby 설치: <code>brew install ruby</code><br>
                • 새 터미널에서 CocoaPods 재설치
              </div>
            </li>
            <li class="step">
              <strong>프로젝트 압축 해제</strong><br>
              다운로드한 ZIP 파일을 더블클릭하여 압축을 해제하세요.
            </li>
            <li class="step">
              <strong>종속성 설치</strong>
              <div class="code">cd /압축해제경로/ios/App<br>pod install</div>
            </li>
            <li class="step">
              <strong>Xcode에서 실행</strong>
              <div class="code">open App.xcworkspace</div>
              <div class="warning">
                <strong>중요:</strong> .xcworkspace 파일을 열어야 합니다! (.xcodeproj 아님)
              </div>
            </li>
            <li class="step">
              <strong>시뮬레이터에서 실행</strong><br>
              Xcode에서 iPhone 시뮬레이터를 선택하고 ⌘+R 키를 누르세요.
            </li>
          </ol>
        </div>

        <div class="features">
          <div class="feature">
            <span class="feature-icon">💬</span>
            <strong>실시간 채팅</strong>
          </div>
          <div class="feature">
            <span class="feature-icon">🎤</span>
            <strong>음성 메시지</strong>
          </div>
          <div class="feature">
            <span class="feature-icon">📎</span>
            <strong>파일 공유</strong>
          </div>
          <div class="feature">
            <span class="feature-icon">🔔</span>
            <strong>푸시 알림</strong>
          </div>
          <div class="feature">
            <span class="feature-icon">📸</span>
            <strong>카메라 연동</strong>
          </div>
          <div class="feature">
            <span class="feature-icon">📳</span>
            <strong>햅틱 피드백</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
};

export const iosFileNewHandler = (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), 'ios-temp', 'dovie-messenger-ios-fixed.zip');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stats = fs.statSync(filePath);
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="dovie-messenger-ios-fixed.zip"');
  res.setHeader('Content-Length', stats.size);
  
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
};