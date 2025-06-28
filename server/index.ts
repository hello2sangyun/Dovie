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
            padding: 30px; 
            text-align: center; 
            background: linear-gradient(135deg, #8B5CF6, #3B82F6);
            color: white;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 700px;
            margin: 0 auto;
        }
        h1 { margin-bottom: 20px; }
        .download-section {
            margin: 30px 0;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
        }
        .download-btn {
            display: inline-block;
            background: #10B981;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            margin: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            min-width: 120px;
        }
        .download-btn:hover {
            background: #059669;
            transform: translateY(-2px);
        }
        .part-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .info {
            margin-top: 30px;
            font-size: 16px;
            line-height: 1.6;
            text-align: left;
        }
        code {
            background: rgba(0,0,0,0.3);
            padding: 2px 6px;
            border-radius: 4px;
        }
        .progress {
            margin: 20px 0;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        .auto-download {
            background: #6366F1;
        }
    </style>
    <script>
        let downloadedParts = [];
        let totalParts = 9;
        
        function downloadPart(partName) {
            const btn = document.getElementById('btn-' + partName);
            btn.style.background = '#F59E0B';
            btn.textContent = '다운로드 중...';
            
            fetch('/ios-part/' + partName)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = partName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    btn.style.background = '#059669';
                    btn.textContent = '완료 ✓';
                    downloadedParts.push(partName);
                    updateProgress();
                })
                .catch(error => {
                    btn.style.background = '#EF4444';
                    btn.textContent = '재시도';
                });
        }
        
        function updateProgress() {
            const progress = document.getElementById('progress');
            progress.textContent = downloadedParts.length + ' / ' + totalParts + ' 완료';
            
            if (downloadedParts.length === totalParts) {
                document.getElementById('merge-instructions').style.display = 'block';
            }
        }
        
        function downloadAll() {
            const parts = ['aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai'];
            parts.forEach((part, index) => {
                setTimeout(() => downloadPart('ios-part-' + part), index * 1000);
            });
        }
    </script>
</head>
<body>
    <div class="container">
        <h1>📱 Dovie Messenger iOS 프로젝트</h1>
        <p>대용량 파일을 안정적으로 다운로드하기 위해 9개 조각으로 분할했습니다 (총 164MB)</p>
        
        <div class="download-section">
            <h3>자동 다운로드 (권장)</h3>
            <button onclick="downloadAll()" class="download-btn auto-download">
                🚀 모든 파일 자동 다운로드
            </button>
            <div class="progress">
                <div id="progress">0 / 9 완료</div>
            </div>
        </div>
        
        <div class="download-section">
            <h3>개별 다운로드</h3>
            <div class="part-grid">
                <a href="#" onclick="downloadPart('ios-part-aa')" class="download-btn" id="btn-ios-part-aa">Part 1 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ab')" class="download-btn" id="btn-ios-part-ab">Part 2 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ac')" class="download-btn" id="btn-ios-part-ac">Part 3 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ad')" class="download-btn" id="btn-ios-part-ad">Part 4 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ae')" class="download-btn" id="btn-ios-part-ae">Part 5 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-af')" class="download-btn" id="btn-ios-part-af">Part 6 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ag')" class="download-btn" id="btn-ios-part-ag">Part 7 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ah')" class="download-btn" id="btn-ios-part-ah">Part 8 (20MB)</a>
                <a href="#" onclick="downloadPart('ios-part-ai')" class="download-btn" id="btn-ios-part-ai">Part 9 (4MB)</a>
            </div>
        </div>
        
        <div class="info" id="merge-instructions" style="display:none;">
            <h3>✅ 모든 파일 다운로드 완료!</h3>
            <h4>파일 합치기 방법:</h4>
            <p>1. 다운로드된 9개 파일을 모두 같은 폴더에 모으기</p>
            <p>2. 터미널에서 해당 폴더로 이동</p>
            <p>3. <code>cat ios-part-* > dovie-messenger-ios.tar.gz</code> 실행</p>
            <p>4. <code>tar -xzf dovie-messenger-ios.tar.gz</code>로 압축 해제</p>
            <p>5. 압축 해제된 폴더에서 <code>npm install</code> 실행</p>
            <p>6. <code>npx cap sync ios</code> 실행</p>
            <p>7. <code>npx cap open ios</code>로 Xcode에서 열기</p>
        </div>
        
        <div class="info">
            <h4>💡 다운로드가 안 되는 경우:</h4>
            <p>• 브라우저 팝업 차단을 해제해주세요</p>
            <p>• 개별 다운로드 버튼을 클릭해서 수동으로 받으세요</p>
            <p>• 모든 파일이 같은 Downloads 폴더에 저장되었는지 확인하세요</p>
        </div>
    </div>
</body>
</html>`;
  
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(downloadPageHTML);
});

// iOS 파일 조각 다운로드
app.get("/ios-part/:partName", (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const partName = req.params.partName;
  
  // 보안을 위해 파일명 검증
  if (!partName.match(/^ios-part-[a-z]{2}$/)) {
    return res.status(400).json({ message: "잘못된 파일명입니다." });
  }
  
  const filePath = path.join(process.cwd(), partName);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: `파일 ${partName}을 찾을 수 없습니다.` });
  }
  
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${partName}"`,
    'Cache-Control': 'no-cache'
  });
  
  res.sendFile(filePath);
});

// iOS 파일 다운로드 (전체 파일 - 백업용)
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
