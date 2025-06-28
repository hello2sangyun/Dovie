import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
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
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Dovie Messenger iOS 프로젝트</h1>
        <p>iOS 네이티브 앱으로 변환된 완전한 프로젝트를 다운로드하세요</p>
        
        <a href="/ios-download-file" class="download-btn" download>
            📦 프로젝트 다운로드 (164MB)
        </a>
        
        <div class="info">
            <h3>다운로드 후 설치 방법:</h3>
            <p>1. 다운로드된 파일을 맥북의 원하는 폴더에 압축 해제</p>
            <p>2. 터미널에서 프로젝트 폴더로 이동</p>
            <p>3. <code>npm install</code> 실행</p>
            <p>4. <code>npx cap sync ios</code> 실행</p>
            <p>5. <code>npx cap open ios</code>로 Xcode에서 실행</p>
        </div>
    </div>
</body>
</html>`;
  
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(downloadPageHTML);
});

// iOS 파일 다운로드
app.get("/ios-download-file", (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const filePath = path.join(process.cwd(), "dovie-messenger-ios.tar.gz");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "다운로드 파일을 찾을 수 없습니다." });
  }
  
  res.set({
    'Content-Type': 'application/gzip',
    'Content-Disposition': 'attachment; filename="dovie-messenger-ios.tar.gz"',
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
