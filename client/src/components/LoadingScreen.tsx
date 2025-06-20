import { useEffect, useState } from "react";

interface LoadingScreenProps {
  message?: string;
  progress?: number;
}

export default function LoadingScreen({ 
  message = "프로필 이미지를 다운로드하는 중...", 
  progress 
}: LoadingScreenProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner - 중앙 배치 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-gray-600 rounded-full animate-spin">
            <div className="w-full h-full border-t-4 border-blue-600 dark:border-blue-400 rounded-full"></div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {message}{dots}
          </p>
          
          {progress !== undefined && (
            <div className="w-64 mx-auto">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {Math.round(progress || 0)}% 완료
              </p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-4">
          처음 로그인 시 모든 프로필 이미지를 다운로드하여 빠른 채팅 경험을 제공합니다
        </p>
      </div>
    </div>
  );
}