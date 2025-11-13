import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Mic, Sparkles, File, MapPin, Users, Bell, User, Youtube, Hash, Search } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface UserGuidePageProps {
  onBack: () => void;
}

export default function UserGuidePage({ onBack }: UserGuidePageProps) {
  useSwipeBack({ onBack });

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">사용 가이드</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Introduction */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-purple-600">
              Dovie Messenger에 오신 것을 환영합니다!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              Dovie Messenger는 실시간 채팅, 음성 메시지, AI 기반 스마트 기능을 제공하는 차세대 메신저입니다. 
              파일 공유, 위치 기반 채팅, 그룹 채팅 등 다양한 기능을 통해 소통의 새로운 경험을 만나보세요.
            </p>
          </CardContent>
        </Card>

        {/* 1. 채팅 시작하기 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
              1. 채팅 시작하기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">새 대화 시작</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 하단의 <strong>연락처</strong> 탭으로 이동</li>
                <li>• 대화하고 싶은 사용자 선택</li>
                <li>• 메시지 입력 후 전송 버튼 클릭</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">메시지 기능</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 이모지 반응: 메시지를 길게 눌러 이모지 추가</li>
                <li>• 답장: 메시지를 밀어서 답장 보내기</li>
                <li>• 삭제: 메시지를 길게 눌러 삭제하기</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 2. 음성 메시지 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Mic className="h-5 w-5 mr-2 text-red-600" />
              2. 음성 메시지 보내기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">녹음 방법</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 채팅방에서 <strong>마이크 버튼을 길게 누르기</strong></li>
                <li>• 녹음 중 손을 떼면 자동으로 전송</li>
                <li>• 배경을 클릭하면 녹음 취소</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">편리한 기능</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 자동 음성 변환: 음성이 자동으로 텍스트로 변환됩니다</li>
                <li>• 재생 속도 조절: 음성 메시지를 빠르게 들을 수 있습니다</li>
                <li>• 파형 표시: 음성의 강도를 시각적으로 확인</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 3. AI 명령어 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
              3. AI 명령어 사용하기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">주요 명령어</h4>
              <ul className="text-sm text-gray-700 space-y-2 ml-4">
                <li>
                  <strong>/번역 [언어] [텍스트]</strong>
                  <br />
                  <span className="text-gray-600">예: /번역 영어 안녕하세요</span>
                </li>
                <li>
                  <strong>/요약 [텍스트]</strong>
                  <br />
                  <span className="text-gray-600">긴 텍스트를 간단하게 요약</span>
                </li>
                <li>
                  <strong>/질문 [질문 내용]</strong>
                  <br />
                  <span className="text-gray-600">AI가 질문에 답변</span>
                </li>
              </ul>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                💡 <strong>팁:</strong> 설정에서 AI 기능을 활성화/비활성화할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. 파일 공유 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <File className="h-5 w-5 mr-2 text-green-600" />
              4. 파일 공유 및 다운로드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">파일 업로드</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• <strong>📎 버튼</strong>을 눌러 파일 선택</li>
                <li>• 이미지, 동영상, 문서 등 다양한 형식 지원</li>
                <li>• 파일 크기: 최대 100MB</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">해시태그로 파일 관리</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 파일 업로드 시 <strong>#태그</strong> 추가</li>
                <li>• 자료실에서 태그로 빠르게 검색</li>
                <li>• 예: #계약서 #디자인 #영수증</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">파일 다운로드</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 파일을 탭하여 미리보기</li>
                <li>• 공유 버튼으로 다른 앱에 전송</li>
                <li>• 저장 버튼으로 기기에 다운로드</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 5. 위치 공유 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-orange-600" />
              5. 위치 공유 및 주변 채팅방
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">내 위치 공유</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 채팅방에서 <strong>위치 아이콘</strong> 클릭</li>
                <li>• 현재 위치 또는 특정 장소 선택</li>
                <li>• 위치 정보를 메시지로 전송</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">주변 채팅방</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 내 위치 기반으로 주변 채팅방 발견</li>
                <li>• 같은 지역 사람들과 소통</li>
                <li>• 지역 정보 및 모임 공유</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 6. 그룹 채팅 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Users className="h-5 w-5 mr-2 text-indigo-600" />
              6. 그룹 채팅 만들기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">그룹 생성</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 채팅 탭에서 <strong>+ 버튼</strong> 클릭</li>
                <li>• 그룹 이름 및 프로필 사진 설정</li>
                <li>• 초대할 멤버 선택</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">그룹 관리</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 멤버 추가/제거</li>
                <li>• 관리자 권한 부여</li>
                <li>• 그룹 설정 변경</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 7. YouTube 공유 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Youtube className="h-5 w-5 mr-2 text-red-600" />
              7. YouTube 영상 공유
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">영상 검색 및 공유</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 채팅방에서 <strong>YouTube 아이콘</strong> 클릭</li>
                <li>• 키워드로 영상 검색</li>
                <li>• 원하는 영상을 선택하여 공유</li>
                <li>• 미리보기와 함께 메시지 전송</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 8. 검색 및 해시태그 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Search className="h-5 w-5 mr-2 text-teal-600" />
              8. 검색 및 해시태그
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">통합 검색</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 상단 검색창에서 메시지, 파일, 연락처 검색</li>
                <li>• 키워드 입력으로 빠른 검색</li>
                <li>• 검색 필터로 정확한 결과 확인</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">해시태그 활용</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 파일에 #해시태그 추가</li>
                <li>• 자료실에서 태그별 필터링</li>
                <li>• 중요한 자료를 쉽게 찾기</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 9. 알림 설정 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Bell className="h-5 w-5 mr-2 text-yellow-600" />
              9. 알림 및 배지 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">알림 설정</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 설정 → 알림 설정으로 이동</li>
                <li>• 푸시 알림 켜기/끄기</li>
                <li>• 알림 소리 및 진동 설정</li>
                <li>• 채팅방별 알림 설정</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">앱 배지</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 읽지 않은 메시지 수를 앱 아이콘에 표시</li>
                <li>• 홈 화면에서 한눈에 확인</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 10. 프로필 및 계정 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-600" />
              10. 프로필 및 계정 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">프로필 편집</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 설정 → 개인정보로 이동</li>
                <li>• 프로필 사진, 이름, 상태 메시지 변경</li>
                <li>• 전화번호 및 이메일 관리</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">계정 보안</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• 비밀번호 변경</li>
                <li>• 2단계 인증 설정</li>
                <li>• 로그인 기기 관리</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-0 shadow-md">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">더 궁금한 점이 있으신가요?</h3>
            <p className="text-sm text-gray-700 mb-4">
              추가 도움이 필요하시면 설정 → 도움말 & 지원으로 문의해주세요.
            </p>
            <Button 
              onClick={onBack}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              설정으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
