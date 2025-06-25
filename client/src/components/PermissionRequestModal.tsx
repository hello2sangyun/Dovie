import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Mic, Shield, CheckCircle, X } from 'lucide-react';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantPermissions: () => Promise<void>;
}

export function PermissionRequestModal({ isOpen, onClose, onGrantPermissions }: PermissionRequestModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isGranted, setIsGranted] = useState(false);

  if (!isOpen) return null;

  const handleGrantPermissions = async () => {
    setIsRequesting(true);
    try {
      await onGrantPermissions();
      setIsGranted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto transform scale-100 animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              앱 권한 설정
            </h2>
            <p className="text-gray-600 text-sm">
              원활한 서비스 이용을 위해 권한이 필요합니다
            </p>
          </div>
        </div>

        {/* Permission Items */}
        <div className="px-6 space-y-4">
          {/* Push Notification Permission */}
          <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">푸시 알림</h3>
              <p className="text-sm text-gray-600">
                새 메시지가 도착했을 때 즉시 알림을 받을 수 있습니다
              </p>
            </div>
          </div>

          {/* Microphone Permission */}
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">마이크</h3>
              <p className="text-sm text-gray-600">
                음성 메시지를 녹음하고 전송할 수 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* Success State */}
        {isGranted && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">권한이 허용되었습니다!</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 pt-4 space-y-3">
          <Button
            onClick={handleGrantPermissions}
            disabled={isRequesting || isGranted}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isRequesting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>권한 요청 중...</span>
              </div>
            ) : isGranted ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>완료</span>
              </div>
            ) : (
              "권한 허용하기"
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isRequesting}
            className="w-full h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
          >
            나중에 설정하기
          </Button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-500 text-center">
            언제든지 설정에서 권한을 변경할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}