import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// iOS 다운로드 페이지
router.get('/ios-download-final', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dovie Messenger iOS 앱 다운로드</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                min-height: 100vh;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: white;
            }
            
            h1 {
                color: #2c3e50;
                margin: 0 0 10px 0;
                font-size: 2.5rem;
                font-weight: 300;
            }
            
            .subtitle {
                color: #7f8c8d;
                font-size: 1.2rem;
                margin-bottom: 30px;
            }
            
            .download-section {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
            }
            
            .download-btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                border-radius: 50px;
                text-decoration: none;
                font-weight: 600;
                font-size: 1.1rem;
                transition: transform 0.3s ease;
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            }
            
            .download-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
            }
            
            .file-info {
                margin-top: 20px;
                padding: 20px;
                background: white;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            
            .specs {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            
            .spec-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 15px;
                text-align: center;
            }
            
            .spec-card h3 {
                color: #667eea;
                margin-top: 0;
            }
            
            .installation-steps {
                background: #e8f5e8;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
            }
            
            .installation-steps h3 {
                color: #27ae60;
                margin-top: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .step {
                margin: 15px 0;
                padding: 15px;
                background: white;
                border-radius: 10px;
                border-left: 4px solid #27ae60;
            }
            
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .warning h4 {
                color: #856404;
                margin-top: 0;
            }
            
            code {
                background: #f1f2f6;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'SF Mono', Monaco, monospace;
            }
            
            .code-block {
                background: #2d3748;
                color: #e2e8f0;
                padding: 20px;
                border-radius: 10px;
                overflow-x: auto;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📱</div>
                <h1>Dovie Messenger</h1>
                <p class="subtitle">iOS 네이티브 앱 다운로드</p>
            </div>
            
            <div class="download-section">
                <h2>🚀 iOS 프로젝트 다운로드</h2>
                <p>완전한 iOS 프로젝트 파일로, Xcode에서 바로 실행 가능합니다</p>
                
                <a href="/api/ios-download-final/dovie-messenger-ios-final.zip" class="download-btn" download>
                    📱 iOS 프로젝트 다운로드 (168KB)
                </a>
                
                <div class="file-info">
                    <strong>파일 정보:</strong><br>
                    • 파일명: dovie-messenger-ios-final.zip<br>
                    • 크기: 168KB<br>
                    • 포함 내용: 완전한 Capacitor iOS 프로젝트
                </div>
            </div>
            
            <div class="specs">
                <div class="spec-card">
                    <h3>🔧 시스템 요구사항</h3>
                    <p>• macOS Monterey 12.0+<br>
                    • Xcode 14.0+<br>
                    • CocoaPods<br>
                    • Ruby 2.7+</p>
                </div>
                
                <div class="spec-card">
                    <h3>📱 앱 기능</h3>
                    <p>• 실시간 채팅<br>
                    • 네이티브 푸시 알림<br>
                    • 음성 메시지<br>
                    • 파일 공유</p>
                </div>
                
                <div class="spec-card">
                    <h3>⚡ 성능</h3>
                    <p>• 네이티브 iOS 앱<br>
                    • 최적화된 성능<br>
                    • App Store 배포 준비<br>
                    • iOS 14.0+ 지원</p>
                </div>
            </div>
            
            <div class="installation-steps">
                <h3>🛠️ 설치 가이드</h3>
                
                <div class="step">
                    <strong>1단계: 다운로드 및 압축 해제</strong><br>
                    위 버튼을 클릭해서 ZIP 파일을 다운로드하고 압축을 해제하세요.
                </div>
                
                <div class="step">
                    <strong>2단계: 터미널에서 프로젝트 폴더로 이동</strong>
                    <div class="code-block">cd /다운로드경로/dovie-messenger-ios-final<br>cd ios/App</div>
                </div>
                
                <div class="step">
                    <strong>3단계: CocoaPods 종속성 설치</strong>
                    <div class="code-block">pod install</div>
                </div>
                
                <div class="step">
                    <strong>4단계: Xcode에서 워크스페이스 열기</strong>
                    <div class="code-block">open App.xcworkspace</div>
                    ⚠️ <code>.xcodeproj</code>가 아닌 <code>.xcworkspace</code> 파일을 열어야 합니다!
                </div>
                
                <div class="step">
                    <strong>5단계: 시뮬레이터에서 실행</strong><br>
                    Xcode에서 디바이스를 선택하고 ⌘+R 키를 누르거나 재생 버튼을 클릭하세요.
                </div>
            </div>
            
            <div class="warning">
                <h4>⚠️ CocoaPods 설치가 필요한 경우</h4>
                <p>CocoaPods가 설치되어 있지 않다면 다음 명령어로 설치하세요:</p>
                <div class="code-block">sudo gem install cocoapods</div>
                <p>Ruby 버전 문제가 있다면 Homebrew를 이용해 최신 Ruby를 설치하세요:</p>
                <div class="code-block">brew install ruby<br>sudo gem install cocoapods</div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee;">
                <p style="color: #7f8c8d;">
                    Dovie Messenger iOS 앱 - 네이티브 모바일 메신저 경험
                </p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// 실제 파일 다운로드 엔드포인트
router.get('/ios-download-final/dovie-messenger-ios-final.zip', (req, res) => {
  const filePath = path.join(process.cwd(), 'ios', 'App', 'dovie-messenger-ios-final.zip');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'iOS 프로젝트 파일을 찾을 수 없습니다.' });
  }
  
  const stat = fs.statSync(filePath);
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="dovie-messenger-ios-final.zip"');
  res.setHeader('Content-Length', stat.size);
  
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

export default router;