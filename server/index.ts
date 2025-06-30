import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import iosDownloadRouter from "./ios-download-final";
import { iosDownloadNewHandler, iosFileNewHandler } from "./ios-download-new";

const app = express();

// CORS 미들웨어 추가 - iOS 앱 접근 허용
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// iOS 다운로드 라우트를 Vite보다 먼저 등록
app.get("/ios-download", (req, res) => {
  const downloadPageHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Dovie Messenger iOS 프로젝트 다운로드</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 50px; 
            text-align: center; 
            background: linear-gradient(135deg, #8B5CF6, #3B82F6);
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
        h1 { margin-bottom: 30px; }
        .download-btn {
            display: inline-block;
            background: #10B981;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            margin: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        .download-btn:hover {
            background: #059669;
            transform: translateY(-2px);
        }
        .info {
            margin-top: 30px;
            font-size: 16px;
            line-height: 1.6;
        }
        code {
            background: rgba(0,0,0,0.3);
            padding: 2px 6px;
            border-radius: 4px;
        }
        .highlight {
            background: rgba(255,255,0,0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Dovie Messenger iOS 프로젝트</h1>
        <div class="highlight">
            <p><strong>✨ 새로운 ZIP 형식!</strong></p>
            <p>더 작고 호환성이 좋은 ZIP 파일로 변경되었습니다 (160KB)</p>
        </div>
        
        <a href="/ios-download-zip" class="download-btn" download>
            📦 iOS 프로젝트 다운로드 (ZIP)
        </a>
        
        <div class="info">
            <h3>다운로드 후 설치 방법:</h3>
            <p>1. 다운로드된 ZIP 파일을 맥북에서 더블클릭하여 압축 해제</p>
            <p>2. 터미널에서 압축 해제된 <code>ios</code> 폴더가 있는 위치로 이동</p>
            <p>3. 터미널에서 다음 명령어들을 순서대로 실행:</p>
            <div style="text-align: left; margin: 20px 0; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px;">
                <code>cd ios/App</code><br>
                <code>pod install</code><br>
                <code>open App.xcworkspace</code>
            </div>
            <p>4. Xcode가 열리면 상단에서 시뮬레이터를 선택하고 실행 버튼 클릭</p>
            
            <div class="highlight">
                <h4>🔧 CocoaPods이 설치되지 않은 경우:</h4>
                <p><code>sudo gem install cocoapods</code> 명령어로 먼저 설치하세요</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(downloadPageHTML);
});

// iOS ZIP 파일 다운로드
app.get("/ios-download-zip", (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const filePath = path.join(process.cwd(), "dovie-messenger-ios.zip");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "ZIP 파일을 찾을 수 없습니다." });
  }
  
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="dovie-messenger-ios.zip"',
    'Cache-Control': 'no-cache'
  });
  
  res.sendFile(filePath);
});

// 루트 디렉토리의 정적 파일 서비스 (download.html 등)
app.use(express.static('./', { 
  dotfiles: 'ignore',
  etag: false,
  extensions: ['html'],
  index: false,
  maxAge: '1d',
  redirect: false
}));

// 정적 파일 미들웨어 제거 - routes.ts에서 복호화하여 서빙함

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // iOS 다운로드 라우터 등록
  app.use('/api', iosDownloadRouter);
  
  // 새로운 iOS 다운로드 엔드포인트 등록
  app.get('/api/ios-download-new', iosDownloadNewHandler);
  app.get('/api/ios-file-new', iosFileNewHandler);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
