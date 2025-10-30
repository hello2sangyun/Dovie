import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, HelpCircle, Mail, MessageCircle, FileText, Info, ExternalLink, BookOpen, Shield } from "lucide-react";

interface HelpSupportPageProps {
  onBack: () => void;
}

export default function HelpSupportPage({ onBack }: HelpSupportPageProps) {
  const appVersion = "1.0.0";
  const buildDate = new Date().toLocaleDateString('ko-KR');

  const handleEmailSupport = () => {
    window.location.href = "mailto:support@doviemessenger.com?subject=Dovie Messenger 문의";
  };

  const openHelpCenter = () => {
    window.open("https://help.doviemessenger.com", "_blank");
  };

  const openTerms = () => {
    window.open("https://doviemessenger.com/terms", "_blank");
  };

  const openPrivacy = () => {
    window.open("https://doviemessenger.com/privacy", "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">도움말 & 지원</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Help Resources */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
              도움말 센터
            </CardTitle>
            <CardDescription>
              자주 묻는 질문과 사용 가이드
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={openHelpCenter}
              className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all text-left group"
              data-testid="button-help-center"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">사용 가이드</div>
                    <div className="text-sm text-gray-500">앱 사용법 및 팁 확인하기</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-green-600" />
              문의하기
            </CardTitle>
            <CardDescription>
              문제가 해결되지 않으셨나요?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={handleEmailSupport}
              className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all text-left group"
              data-testid="button-email-support"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">이메일 문의</div>
                    <div className="text-sm text-gray-500">support@doviemessenger.com</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-600" />
              약관 및 정책
            </CardTitle>
            <CardDescription>
              서비스 이용약관 및 개인정보 처리방침
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={openTerms}
              className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left group"
              data-testid="button-terms"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">이용 약관</span>
                </div>
                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
              </div>
            </button>
            <button
              onClick={openPrivacy}
              className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left group"
              data-testid="button-privacy"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">개인정보 처리방침</span>
                </div>
                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
              </div>
            </button>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Info className="h-5 w-5 mr-2 text-purple-600" />
              앱 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">버전</span>
              <span className="text-sm font-medium text-gray-900">{appVersion}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">빌드 날짜</span>
              <span className="text-sm font-medium text-gray-900">{buildDate}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">개발사</span>
              <span className="text-sm font-medium text-gray-900">Dovie Team</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">© 2025 Dovie Messenger. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
