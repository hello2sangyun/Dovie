import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface TermsOfServicePageProps {
  onBack: () => void;
}

export default function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
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
        <h1 className="text-lg font-semibold text-gray-900">이용 약관</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center text-purple-600">
              <FileText className="h-5 w-5 mr-2" />
              Dovie Messenger 서비스 이용약관
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              본 약관은 Dovie Team이 제공하는 Dovie Messenger 서비스(이하 "서비스")의 이용과 관련하여 
              회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              최종 업데이트: 2025년 1월 1일
            </p>
          </CardContent>
        </Card>

        {/* 제1조 목적 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제1조 (목적)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              본 약관은 Dovie Messenger(이하 "회사")가 제공하는 메신저 서비스 및 관련 제반 서비스의 
              이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </CardContent>
        </Card>

        {/* 제2조 정의 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제2조 (용어의 정의)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1. "서비스"</strong>란 회사가 제공하는 실시간 메시징, 음성 메시지, 파일 공유, AI 기능 등을 포함한 모든 기능과 서비스를 의미합니다.</p>
              <p><strong>2. "회원"</strong>이란 본 약관에 동의하고 회사와 이용 계약을 체결하여 서비스를 이용하는 자를 말합니다.</p>
              <p><strong>3. "아이디(ID)"</strong>란 회원 식별과 서비스 이용을 위해 회원이 선정하고 회사가 승인한 문자, 숫자 또는 그 조합을 의미합니다.</p>
              <p><strong>4. "콘텐츠"</strong>란 회원이 서비스를 이용하면서 게시, 전송, 업로드하는 부호, 문자, 음성, 음향, 화상, 동영상 등의 정보를 말합니다.</p>
              <p><strong>5. "AI 기능"</strong>이란 인공지능을 활용한 번역, 요약, 질문 응답 등의 서비스를 의미합니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제3조 약관의 효력 및 변경 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제3조 (약관의 효력 및 변경)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</p>
              <p><strong>2.</strong> 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</p>
              <p><strong>3.</strong> 약관 변경 시 변경 내용과 적용일자를 명시하여 현행 약관과 함께 서비스 초기 화면에 그 적용일 7일 전부터 적용일 이후 상당한 기간 동안 공지합니다.</p>
              <p><strong>4.</strong> 회원이 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주됩니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제4조 회원가입 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제4조 (회원가입)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 서비스 이용을 희망하는 자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</p>
              <p><strong>2.</strong> 회사는 제1항과 같이 회원으로 가입할 것을 신청한 자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:</p>
              <ul className="ml-4 space-y-1">
                <li>• 등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                <li>• 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                <li>• 만 14세 미만인 경우</li>
              </ul>
              <p><strong>3.</strong> 회원가입계약의 성립 시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제5조 서비스의 제공 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제5조 (서비스의 제공)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 회원에게 아래와 같은 서비스를 제공합니다:</p>
              <ul className="ml-4 space-y-1">
                <li>• 실시간 메시지 송수신 서비스</li>
                <li>• 음성 메시지 녹음 및 전송 서비스</li>
                <li>• 파일 및 미디어 공유 서비스</li>
                <li>• AI 기반 번역, 요약, 질문 응답 서비스</li>
                <li>• 위치 기반 채팅방 서비스</li>
                <li>• 그룹 채팅 서비스</li>
                <li>• 기타 회사가 추가 개발하거나 제휴계약 등을 통해 회원에게 제공하는 일체의 서비스</li>
              </ul>
              <p><strong>2.</strong> 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</p>
              <p><strong>3.</strong> 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제6조 회원의 의무 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제6조 (회원의 의무)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회원은 다음 각 호의 행위를 하여서는 안 됩니다:</p>
              <ul className="ml-4 space-y-1">
                <li>• 신청 또는 변경 시 허위 내용의 등록</li>
                <li>• 타인의 정보 도용</li>
                <li>• 회사가 게시한 정보의 변경</li>
                <li>• 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                <li>• 회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>• 회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                <li>• 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                <li>• 스팸 메시지 전송 및 상업적 광고의 무단 전송</li>
              </ul>
              <p><strong>2.</strong> 회원은 관계법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항, 회사가 통지하는 사항 등을 준수하여야 합니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제7조 개인정보보호 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제7조 (개인정보보호)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 회원의 개인정보 수집 시 서비스제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.</p>
              <p><strong>2.</strong> 회사는 회원가입 시 구매계약이행에 필요한 정보를 미리 수집하지 않습니다. 다만, 관련 법령상 의무이행을 위하여 구매계약 이전에 본인확인이 필요한 경우로서 최소한의 특정 개인정보를 수집하는 경우에는 그러하지 아니합니다.</p>
              <p><strong>3.</strong> 회사는 회원의 개인정보를 수집·이용하는 때에는 당해 회원에게 그 목적을 고지하고 동의를 받습니다.</p>
              <p><strong>4.</strong> 자세한 개인정보 처리 방침은 별도의 개인정보 처리방침에 따릅니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제8조 회사의 의무 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제8조 (회사의 의무)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 본 약관이 정하는 바에 따라 지속적이고 안정적으로 서비스를 제공하는데 최선을 다하여야 합니다.</p>
              <p><strong>2.</strong> 회사는 회원이 안전하게 서비스를 이용할 수 있도록 회원의 개인정보(신용정보 포함) 보호를 위한 보안 시스템을 갖추어야 합니다.</p>
              <p><strong>3.</strong> 회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제9조 저작권 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제9조 (저작권의 귀속 및 이용제한)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.</p>
              <p><strong>2.</strong> 회원은 서비스를 이용함으로써 얻은 정보 중 회사에게 지적재산권이 귀속된 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</p>
              <p><strong>3.</strong> 회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제10조 계약 해지 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제10조 (계약 해지 및 이용 제한)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회원은 언제든지 서비스 이용을 원하지 않는 경우 회원 탈퇴를 통해 이용계약을 해지할 수 있습니다.</p>
              <p><strong>2.</strong> 회사는 회원이 다음 각 호의 사유에 해당하는 경우, 사전통지 없이 이용계약을 해지하거나 또는 기간을 정하여 서비스 이용을 중지할 수 있습니다:</p>
              <ul className="ml-4 space-y-1">
                <li>• 타인의 서비스 ID 및 비밀번호를 도용한 경우</li>
                <li>• 서비스 운영을 고의로 방해한 경우</li>
                <li>• 가입한 이름이 실명이 아닌 경우</li>
                <li>• 같은 사용자가 다른 ID로 이중등록을 한 경우</li>
                <li>• 공공질서 및 미풍양속에 저해되는 내용을 유포시킨 경우</li>
                <li>• 회원이 국익 또는 사회적 공익을 저해할 목적으로 서비스 이용을 계획 또는 실행하는 경우</li>
                <li>• 타인의 명예를 손상시키거나 불이익을 주는 행위를 한 경우</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 제11조 책임제한 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제11조 (책임제한)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              <p><strong>2.</strong> 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
              <p><strong>3.</strong> 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖에 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</p>
              <p><strong>4.</strong> 회사는 회원 상호간 또는 회원과 제3자 상호간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임도 없습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제12조 분쟁 해결 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제12조 (분쟁 해결)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사는 회원이 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</p>
              <p><strong>2.</strong> 회사는 회원으로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 회원에게 그 사유와 처리일정을 즉시 통보해 드립니다.</p>
              <p><strong>3.</strong> 회사와 회원 간에 발생한 전자상거래 분쟁과 관련하여 회원의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 제13조 재판권 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">제13조 (재판권 및 준거법)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>1.</strong> 회사와 회원 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 회원의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다. 다만, 제소 당시 회원의 주소 또는 거소가 분명하지 않거나 외국 거주자의 경우에는 민사소송법상의 관할법원에 제기합니다.</p>
              <p><strong>2.</strong> 회사와 회원 간에 제기된 전자상거래 소송에는 대한민국법을 적용합니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-700 mb-2">
              <strong>부칙</strong>
            </p>
            <p className="text-sm text-gray-600">
              본 약관은 2025년 1월 1일부터 시행됩니다.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-500">
                © 2025 Dovie Team. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
