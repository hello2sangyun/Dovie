import { useParams } from "wouter";
import { Shield, Mic, Clock, Check, CheckCheck } from "lucide-react";

const ScreenshotDemo = () => {
  const params = useParams<{ id: string }>();
  const screenId = params.id || "1";

  const renderScreen = () => {
    switch (screenId) {
      case "1":
        return <Screen1RealTimeChat />;
      case "2":
        return <Screen2AIQuestions />;
      case "3":
        return <Screen3FileSharing />;
      case "4":
        return <Screen4VoiceMessages />;
      case "5":
        return <Screen5AIInbox />;
      default:
        return <div className="flex items-center justify-center h-full text-white">Invalid screen ID</div>;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-purple-50">
      {/* iPhone 14 Frame */}
      <div className="relative bg-black rounded-[60px] p-4 shadow-2xl" style={{ width: "390px", height: "844px" }}>
        {/* Screen */}
        <div className="relative bg-white rounded-[48px] overflow-hidden h-full flex flex-col">
          {/* Status Bar */}
          <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 px-6 py-2 flex items-center justify-between text-white text-xs font-medium">
            <span>9:41</span>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
              </svg>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
              </svg>
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 overflow-hidden">
            {renderScreen()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Screen 1: Real-Time Chat
const Screen1RealTimeChat = () => {
  const messages = [
    { id: 1, isMe: false, content: "이번 주말에 뭐해?", time: "오후 2:15", read: true, sender: "민지" },
    { id: 2, isMe: true, content: "아직 계획 없어! 같이 놀까?", time: "오후 2:16", read: true },
    { id: 3, isMe: false, content: "좋아! 강남에서 저녁 먹을래?", time: "오후 2:17", read: true, sender: "민지" },
    { id: 4, isMe: true, content: "완전 좋지 👍\n몇 시에 만날까?", time: "오후 2:18", read: true },
    { id: 5, isMe: false, content: "7시 어때? 맛집 하나 찾아볼게!", time: "오후 2:20", read: false, sender: "민지", online: true },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-purple-300 flex items-center justify-center text-white font-semibold">
          민
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold">민지</div>
          <div className="flex items-center space-x-1 text-purple-100 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>온라인</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] ${msg.isMe ? "" : "flex items-start space-x-2"}`}>
              {!msg.isMe && (
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-semibold flex-shrink-0">
                  {msg.sender?.[0]}
                </div>
              )}
              <div>
                {!msg.isMe && (
                  <div className="text-xs text-gray-500 mb-1 px-1">{msg.sender}</div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    msg.isMe
                      ? "bg-gradient-to-br from-purple-600 to-purple-500 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
                <div className="flex items-center space-x-1 mt-1 px-1">
                  <span className="text-xs text-gray-400">{msg.time}</span>
                  {msg.isMe && (
                    msg.read ? (
                      <CheckCheck className="w-3 h-3 text-purple-500" />
                    ) : (
                      <Check className="w-3 h-3 text-gray-400" />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        <div className="flex items-start space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-semibold">
            민
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex-shrink-0 px-4 py-3 bg-purple-50 border-t border-purple-100">
        <div className="flex items-center justify-center space-x-2 text-xs text-purple-600">
          <Shield className="w-3 h-3" />
          <span>메시지와 파일이 종단간 암호화됩니다</span>
        </div>
      </div>
    </div>
  );
};

// Screen 2: AI Questions
const Screen2AIQuestions = () => {
  const messages = [
    { id: 1, isMe: false, content: "지난주에 찍은 사진 보내줄래?", time: "오전 11:20", sender: "수진" },
    { id: 2, isMe: true, content: "/ai 지난주 보낸 사진 찾아줘", time: "오전 11:21", isAICommand: true },
    { id: 3, isMe: true, content: "AI가 찾은 결과:\n\n📸 2024년 1월 8일 - 제주도 여행.jpg\n📸 2024년 1월 10일 - 카페 라테.jpg\n📸 2024년 1월 12일 - 친구들과 저녁.jpg", time: "오전 11:21", isAIResult: true },
    { id: 4, isMe: false, content: "완벽해! 고마워 😊", time: "오전 11:22", sender: "수진" },
    { id: 5, isMe: true, content: "/ai 어디서 만나기로 했지?", time: "오전 11:25", isAICommand: true },
    { id: 6, isMe: true, content: "AI가 찾은 약속:\n\n📍 2024년 1월 20일 (토)\n⏰ 오후 7:00\n🏢 강남역 2번 출구 스타벅스", time: "오전 11:25", isAIResult: true },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-purple-300 flex items-center justify-center text-white font-semibold">
          수
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold">수진</div>
          <div className="flex items-center space-x-1 text-purple-100 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>온라인</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.isMe ? "" : "flex items-start space-x-2"}`}>
              {!msg.isMe && (
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-semibold flex-shrink-0">
                  {msg.sender?.[0]}
                </div>
              )}
              <div>
                {!msg.isMe && (
                  <div className="text-xs text-gray-500 mb-1 px-1">{msg.sender}</div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    msg.isAICommand
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-2 border-blue-300"
                      : msg.isAIResult
                      ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 text-gray-800"
                      : msg.isMe
                      ? "bg-gradient-to-br from-purple-600 to-purple-500 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {msg.isAICommand && (
                    <div className="flex items-center space-x-1 mb-1 text-blue-100 text-xs">
                      <span>✨ AI 명령어</span>
                    </div>
                  )}
                  {msg.isAIResult && (
                    <div className="flex items-center space-x-1 mb-2 text-emerald-700 text-xs font-semibold">
                      <span>🤖 AI 검색 결과</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words text-sm">{msg.content}</div>
                </div>
                <div className="flex items-center space-x-1 mt-1 px-1">
                  <span className="text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Info */}
      <div className="flex-shrink-0 px-4 py-3 bg-blue-50 border-t border-blue-100">
        <div className="text-center text-xs text-blue-600">
          💡 <strong>/ai</strong> 명령어로 채팅 내용을 빠르게 검색하세요
        </div>
      </div>
    </div>
  );
};

// Screen 3: File Sharing
const Screen3FileSharing = () => {
  const messages = [
    { id: 1, isMe: false, content: "여행 사진 보내줘!", time: "오후 3:10", sender: "지혜" },
    {
      id: 2,
      isMe: true,
      type: "image",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
      caption: "제주도 일출 🌅 #여행 #제주도",
      time: "오후 3:12",
    },
    {
      id: 3,
      isMe: true,
      type: "image",
      imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
      caption: "점심 먹은 맛집 #맛집 #부산",
      time: "오후 3:13",
    },
    { id: 4, isMe: false, content: "와 진짜 예쁘다!! 😍", time: "오후 3:14", sender: "지혜" },
    {
      id: 5,
      isMe: true,
      type: "video",
      caption: "바닷가 영상 🌊 #여행",
      time: "오후 3:15",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-purple-300 flex items-center justify-center text-white font-semibold">
          지
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold">지혜</div>
          <div className="flex items-center space-x-1 text-purple-100 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>온라인</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] ${msg.isMe ? "" : "flex items-start space-x-2"}`}>
              {!msg.isMe && (
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-semibold flex-shrink-0">
                  {msg.sender?.[0]}
                </div>
              )}
              <div>
                {!msg.isMe && (
                  <div className="text-xs text-gray-500 mb-1 px-1">{msg.sender}</div>
                )}
                
                {msg.type === "image" ? (
                  <div className="space-y-1">
                    <div className="rounded-2xl overflow-hidden border-2 border-purple-300">
                      <img src={msg.imageUrl} alt="" className="w-full h-48 object-cover" />
                    </div>
                    {msg.caption && (
                      <div className="bg-gradient-to-br from-purple-600 to-purple-500 text-white rounded-2xl px-4 py-2 text-sm">
                        {msg.caption}
                      </div>
                    )}
                  </div>
                ) : msg.type === "video" ? (
                  <div className="space-y-1">
                    <div className="rounded-2xl overflow-hidden bg-gray-900 h-48 flex items-center justify-center border-2 border-purple-300">
                      <div className="text-white text-center">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <div className="text-sm">바닷가 영상.mp4</div>
                        <div className="text-xs text-gray-400 mt-1">1:24</div>
                      </div>
                    </div>
                    {msg.caption && (
                      <div className="bg-gradient-to-br from-purple-600 to-purple-500 text-white rounded-2xl px-4 py-2 text-sm">
                        {msg.caption}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`rounded-2xl px-4 py-2.5 ${msg.isMe ? "bg-gradient-to-br from-purple-600 to-purple-500 text-white" : "bg-white border border-gray-200"}`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                )}
                
                <div className="flex items-center space-x-1 mt-1 px-1">
                  <span className="text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="flex-shrink-0 px-4 py-3 bg-purple-50 border-t border-purple-100">
        <div className="flex items-center justify-center space-x-2 text-xs text-purple-600">
          <Shield className="w-3 h-3" />
          <span>메시지와 파일이 종단간 암호화됩니다</span>
        </div>
      </div>
    </div>
  );
};

// Screen 4: Voice Messages
const Screen4VoiceMessages = () => {
  const messages = [
    { id: 1, isMe: false, content: "회의 시간 언제야?", time: "오전 10:05", sender: "현우" },
    {
      id: 2,
      isMe: true,
      type: "voice",
      duration: "0:42",
      transcription: "안녕하세요, 오늘 회의는 오후 3시에 3층 회의실에서 진행됩니다. 프로젝트 최종 검토 있으니 자료 준비해주세요.",
      time: "오전 10:07",
    },
    { id: 3, isMe: false, content: "알겠어, 고마워!", time: "오전 10:08", sender: "현우" },
    {
      id: 4,
      isMe: false,
      type: "voice",
      duration: "0:15",
      transcription: "혹시 발표 자료도 미리 공유해줄 수 있어?",
      time: "오전 10:09",
      sender: "현우",
    },
    { id: 5, isMe: true, content: "지금 바로 보낼게!", time: "오전 10:10" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-purple-300 flex items-center justify-center text-white font-semibold">
          현
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold">현우</div>
          <div className="flex items-center space-x-1 text-purple-100 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>온라인</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.isMe ? "" : "flex items-start space-x-2"}`}>
              {!msg.isMe && (
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-semibold flex-shrink-0">
                  {msg.sender?.[0]}
                </div>
              )}
              <div className="flex-1">
                {!msg.isMe && msg.sender && (
                  <div className="text-xs text-gray-500 mb-1 px-1">{msg.sender}</div>
                )}
                
                {msg.type === "voice" ? (
                  <div className="space-y-2">
                    {/* Voice Player */}
                    <div className={`rounded-2xl px-4 py-3 ${msg.isMe ? "bg-gradient-to-br from-purple-600 to-purple-500" : "bg-white border border-gray-200"}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.isMe ? "bg-white/20" : "bg-purple-100"}`}>
                          <Mic className={`w-5 h-5 ${msg.isMe ? "text-white" : "text-purple-600"}`} />
                        </div>
                        <div className="flex-1">
                          {/* Waveform */}
                          <div className="flex items-center space-x-0.5 mb-1">
                            {[3, 8, 5, 12, 7, 10, 6, 4, 9, 11, 7, 5, 8, 6, 10, 7, 4, 9].map((height, i) => (
                              <div
                                key={i}
                                className={`w-0.5 rounded-full ${msg.isMe ? "bg-white/60" : "bg-purple-400"}`}
                                style={{ height: `${height}px` }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${msg.isMe ? "text-white/80" : "text-gray-500"}`}>
                              {msg.duration}
                            </span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.isMe ? "bg-white/20" : "bg-purple-100"}`}>
                              <svg className={`w-3 h-3 ${msg.isMe ? "text-white" : "text-purple-600"}`} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Transcription */}
                    {msg.transcription && (
                      <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-700">
                        <div className="flex items-center space-x-1 mb-1 text-xs text-gray-500">
                          <span>📝 실시간 전사</span>
                        </div>
                        <div>{msg.transcription}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`rounded-2xl px-4 py-2.5 ${msg.isMe ? "bg-gradient-to-br from-purple-600 to-purple-500 text-white" : "bg-white border border-gray-200"}`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                )}
                
                <div className="flex items-center space-x-1 mt-1 px-1">
                  <span className="text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Voice Info */}
      <div className="flex-shrink-0 px-4 py-3 bg-blue-50 border-t border-blue-100">
        <div className="text-center text-xs text-blue-600">
          🎤 음성 메시지가 자동으로 텍스트로 변환됩니다
        </div>
      </div>
    </div>
  );
};

// Screen 5: AI Inbox
const Screen5AIInbox = () => {
  const messages = [
    {
      id: 1,
      type: "reminder",
      icon: "📅",
      title: "내일 오전 10시 회의",
      content: "프로젝트 최종 검토 회의\n3층 회의실",
      time: "오늘 오후 5:30",
      from: "팀장님",
    },
    {
      id: 2,
      type: "payment",
      icon: "💳",
      title: "결제 완료 500,000원",
      content: "Dovie Premium 연간 구독",
      time: "오늘 오후 2:15",
      from: "Dovie",
    },
    {
      id: 3,
      type: "important",
      icon: "⚠️",
      title: "긴급: 서버 점검 안내",
      content: "오늘 밤 12시~새벽 2시\n일부 서비스 중단 예정",
      time: "오늘 오전 11:00",
      from: "시스템 관리자",
    },
    {
      id: 4,
      type: "reminder",
      icon: "🎂",
      title: "민지 생일 D-2",
      content: "1월 25일 (목요일)\n선물 준비하기!",
      time: "어제 오후 8:00",
      from: "캘린더",
    },
    {
      id: 5,
      type: "task",
      icon: "✅",
      title: "보고서 제출 마감",
      content: "2024 Q1 분기 보고서\n마감: 1월 30일",
      time: "어제 오전 9:00",
      from: "업무 시스템",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-lg">AI Inbox</div>
            <div className="text-purple-100 text-xs mt-0.5">중요한 메시지만 모아봐요</div>
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold">
            {messages.length}개
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex space-x-2 overflow-x-auto">
        <div className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
          전체
        </div>
        <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs whitespace-nowrap">
          리마인더
        </div>
        <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs whitespace-nowrap">
          결제
        </div>
        <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs whitespace-nowrap">
          중요
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-white border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl flex-shrink-0">{msg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-gray-900 text-sm truncate">{msg.title}</div>
                  <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">{msg.time}</div>
                </div>
                <div className="text-sm text-gray-600 mb-2 whitespace-pre-line">{msg.content}</div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{msg.from}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Info */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-purple-100">
        <div className="text-center text-xs text-purple-600">
          🤖 AI가 중요한 메시지를 자동으로 분류합니다
        </div>
      </div>
    </div>
  );
};

export default ScreenshotDemo;
