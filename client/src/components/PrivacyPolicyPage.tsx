import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
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
        <h1 className="text-lg font-semibold text-gray-900">개인정보 처리방침</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center text-purple-600">
              <Shield className="h-5 w-5 mr-2" />
              Dovie Messenger 개인정보 처리방침
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              Dovie Team(이하 "회사")은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 
              이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              최종 업데이트: 2025년 1월 1일
            </p>
          </CardContent>
        </Card>

        {/* 제1조 개인정보의 처리 목적 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제1조 (개인정보의 처리 목적)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
              
              <div className="space-y-2 mt-3">
                <p><strong>1. 회원 가입 및 관리</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증</li>
                  <li>• 회원자격 유지·관리, 서비스 부정이용 방지</li>
                  <li>• 각종 고지·통지, 고충처리</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>2. 메신저 서비스 제공</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 메시지 송수신 서비스 제공</li>
                  <li>• 음성 메시지 녹음 및 전송</li>
                  <li>• 파일 및 미디어 공유</li>
                  <li>• 위치 기반 서비스 제공</li>
                  <li>• 그룹 채팅 관리</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>3. AI 서비스 제공</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• AI 기반 번역, 요약, 질문 응답 서비스</li>
                  <li>• 음성 메시지 자동 텍스트 변환</li>
                  <li>• 스마트 추천 및 제안 기능</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>4. 서비스 개선 및 통계</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 서비스 이용 통계 분석</li>
                  <li>• 신규 서비스 개발 및 맞춤 서비스 제공</li>
                  <li>• 서비스 품질 개선</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제2조 처리하는 개인정보의 항목 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제2조 (처리하는 개인정보의 항목)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <div className="space-y-2">
                <p><strong>1. 필수 수집 항목</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 회원가입 시: 전화번호, 이메일 주소, 비밀번호</li>
                  <li>• 프로필 설정 시: 사용자명(닉네임), 프로필 사진, 상태 메시지</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>2. 선택 수집 항목</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 위치 정보 (위치 기반 서비스 이용 시)</li>
                  <li>• 음성 녹음 데이터 (음성 메시지 기능 이용 시)</li>
                  <li>• 파일 및 미디어 (파일 공유 기능 이용 시)</li>
                  <li>• 연락처 정보 (연락처 동기화 시)</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>3. 자동 수집 항목</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 서비스 이용 기록, 접속 로그, 쿠키</li>
                  <li>• IP 주소, 기기 정보 (OS 버전, 기기 모델)</li>
                  <li>• 접속 일시, 불량 이용 기록</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제3조 개인정보의 처리 및 보유 기간 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제3조 (개인정보의 처리 및 보유 기간)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              
              <div className="space-y-2 mt-3">
                <p><strong>2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 회원 정보: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지)</li>
                  <li>• 메시지 내용: 발신 시점으로부터 최대 1년 (사용자가 삭제하거나 보유기간 경과 시 즉시 파기)</li>
                  <li>• 음성 메시지: 발신 시점으로부터 최대 1년</li>
                  <li>• 파일 및 미디어: 업로드 시점으로부터 최대 1년</li>
                  <li>• 위치 정보: 서비스 제공 완료 후 즉시 파기</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>3. 관련 법령에 따라 보존하는 경우:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>• 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>• 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>• 접속에 관한 기록: 3개월 (통신비밀보호법)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제4조 개인정보의 제3자 제공 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제4조 (개인정보의 제3자 제공)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>
              
              <p><strong>2.</strong> 회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다:</p>
              <ul className="ml-4 space-y-2">
                <li>
                  <strong>• OpenAI (AI 서비스 제공)</strong>
                  <br />- 제공 항목: 메시지 내용, 음성 데이터
                  <br />- 제공 목적: AI 번역, 요약, 질문 응답, 음성-텍스트 변환
                  <br />- 보유 및 이용 기간: 서비스 제공 완료 후 즉시 파기
                </li>
                <li>
                  <strong>• Twilio (SMS 인증 서비스)</strong>
                  <br />- 제공 항목: 전화번호, 인증 코드
                  <br />- 제공 목적: 본인 확인 및 SMS 발송
                  <br />- 보유 및 이용 기간: 인증 완료 후 즉시 파기
                </li>
              </ul>

              <p className="mt-3"><strong>3.</strong> 회사는 사용자의 개인정보를 판매하거나 영리 목적으로 제3자에게 제공하지 않습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제5조 개인정보 처리의 위탁 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제5조 (개인정보 처리의 위탁)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
              
              <ul className="ml-4 space-y-2">
                <li>
                  <strong>• 수탁업체: Neon (데이터베이스 호스팅)</strong>
                  <br />- 위탁 업무: 데이터베이스 관리 및 백업
                </li>
                <li>
                  <strong>• 수탁업체: Replit (애플리케이션 호스팅)</strong>
                  <br />- 위탁 업무: 서버 운영 및 유지보수
                </li>
              </ul>

              <p className="mt-3"><strong>2.</strong> 회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제6조 정보주체의 권리·의무 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제6조 (정보주체의 권리·의무 및 행사 방법)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
              <ul className="ml-4 space-y-1">
                <li>• 개인정보 열람 요구</li>
                <li>• 오류 등이 있을 경우 정정 요구</li>
                <li>• 삭제 요구</li>
                <li>• 처리정지 요구</li>
              </ul>

              <p className="mt-3"><strong>2.</strong> 제1항에 따른 권리 행사는 회사에 대해 서면, 전화, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</p>

              <p className="mt-3"><strong>3.</strong> 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</p>

              <p className="mt-3"><strong>4.</strong> 제1항에 따른 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수 있습니다. 이 경우 개인정보 보호법 시행규칙 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제7조 개인정보의 파기 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제7조 (개인정보의 파기)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>

              <p><strong>2.</strong> 정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리목적이 달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.</p>

              <p><strong>3.</strong> 개인정보 파기의 절차 및 방법은 다음과 같습니다:</p>
              <ul className="ml-4 space-y-2">
                <li>
                  <strong>• 파기절차</strong>
                  <br />회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                </li>
                <li>
                  <strong>• 파기방법</strong>
                  <br />회사는 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 로우레밸포맷(Low Level Format) 등의 방법을 이용하여 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 제8조 개인정보 보호조치 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제8조 (개인정보의 안전성 확보 조치)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
              
              <div className="space-y-2 mt-3">
                <p><strong>1. 관리적 조치</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 내부관리계획 수립 및 시행</li>
                  <li>• 정기적 직원 교육</li>
                  <li>• 개인정보 처리 담당자 최소화 및 접근 권한 관리</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>2. 기술적 조치</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 개인정보 암호화 (비밀번호, 파일 등)</li>
                  <li>• 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안프로그램 설치</li>
                  <li>• 접속기록의 보관 및 위변조 방지</li>
                  <li>• 개인정보에 대한 접근 제한 및 접근 통제 시스템 구축</li>
                  <li>• HTTPS를 이용한 안전한 통신 채널 구축</li>
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p><strong>3. 물리적 조치</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 전산실, 자료보관실 등의 접근통제</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제9조 개인정보 보호책임자 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제9조 (개인정보 보호책임자)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:</p>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-3">
                <p className="font-semibold text-gray-900">개인정보 보호책임자</p>
                <ul className="mt-2 space-y-1">
                  <li>• 담당 부서: Dovie Team</li>
                  <li>• 이메일: privacy@doviemessenger.com</li>
                  <li>• 전화번호: 1588-0000</li>
                </ul>
              </div>

              <p className="mt-3"><strong>2.</strong> 정보주체께서는 회사의 서비스(또는 사업)를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제10조 권익침해 구제방법 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제10조 (권익침해 구제방법)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p>정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>

              <div className="space-y-2 mt-3">
                <p><strong>• 개인정보분쟁조정위원회</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>- 전화: 1833-6972</li>
                  <li>- 홈페이지: www.kopico.go.kr</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p><strong>• 개인정보침해신고센터</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>- 전화: (국번없이) 118</li>
                  <li>- 홈페이지: privacy.kisa.or.kr</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p><strong>• 대검찰청 사이버범죄수사단</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>- 전화: 02-3480-3573</li>
                  <li>- 홈페이지: www.spo.go.kr</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p><strong>• 경찰청 사이버안전국</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>- 전화: (국번없이) 182</li>
                  <li>- 홈페이지: cyberbureau.police.go.kr</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제11조 개인정보 자동 수집 장치 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제11조 (개인정보 자동 수집 장치의 설치·운영 및 거부)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.</p>

              <p><strong>2.</strong> 쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자들의 PC 컴퓨터내의 하드디스크에 저장되기도 합니다.</p>

              <p><strong>3.</strong> 쿠키의 사용 목적: 이용자가 방문한 각 서비스와 웹 사이트들에 대한 방문 및 이용형태, 인기 검색어, 보안접속 여부 등을 파악하여 이용자에게 최적화된 정보 제공을 위해 사용됩니다.</p>

              <p><strong>4.</strong> 쿠키의 설치·운영 및 거부: 웹브라우저 상단의 도구 {'->'} 인터넷 옵션 {'->'} 개인정보 메뉴의 옵션 설정을 통해 쿠키 저장을 거부할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제12조 개인정보 처리방침 변경 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제12조 (개인정보 처리방침의 변경)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 이 개인정보 처리방침은 2025년 1월 1일부터 적용됩니다.</p>
              <p><strong>2.</strong> 이전의 개인정보 처리방침은 아래에서 확인하실 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium">
                여러분의 개인정보를 안전하게 보호하는 것이 저희의 최우선 목표입니다.
              </p>
              <p className="text-sm text-gray-600">
                개인정보 처리와 관련하여 궁금한 사항이나 문의사항이 있으시면 언제든지 연락 주시기 바랍니다.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500">
                  © 2025 Dovie Team. All rights reserved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
