// 통합 스마트 추천 시스템
export interface SmartSuggestion {
  type: string;
  text: string;
  result?: string;
  icon: string;
  category: string;
  keyword?: string;
  confidence?: number;
  action?: () => void;
}

// 통합 스마트 추천 분석 함수
export const analyzeTextForSmartSuggestions = (text: string): SmartSuggestion[] => {
  if (!text || text.trim().length < 2) {
    return [];
  }

  const suggestions: SmartSuggestion[] = [];
  const lowerText = text.toLowerCase();

  // 1. YouTube 감지 - 가장 구체적인 패턴부터 검사
  if (/유튜브|youtube|영상|비디오|뮤직비디오|mv|검색.*영상|영상.*검색|봐봐|보여.*영상/i.test(text)) {
    // 키워드 추출 (불용어 제거)
    const keyword = text
      .replace(/유튜브|youtube|영상|비디오|뮤직비디오|mv|검색|찾아|보여|봐봐|해줘|하자|보자/gi, '')
      .trim();
    
    suggestions.push({
      type: 'youtube',
      text: `🎥 YouTube에서 "${keyword}" 검색하기`,
      result: `YouTube 영상을 검색합니다: ${keyword}`,
      icon: '🎥',
      category: 'YouTube 검색',
      keyword: keyword || '검색',
      confidence: 0.9
    });
  }

  // 2. 위치 공유 감지
  if (/어디|위치|장소|주소|어디야|어디에|어디로|어디서|여기|거기|오세요|와|갈게|만나|위치공유|현재위치|gps/i.test(text)) {
    suggestions.push({
      type: 'location',
      text: '📍 현재 위치 공유하기',
      result: '현재 위치를 공유합니다',
      icon: '📍',
      category: '위치 공유',
      confidence: 0.85
    });
  }

  // 3. 번역 감지
  if (/번역|translate|영어로|한국어로|일본어로|중국어로|불어로|독어로|스페인어로/i.test(text)) {
    suggestions.push({
      type: 'translation',
      text: '🌐 텍스트 번역하기',
      result: '번역을 진행합니다',
      icon: '🌐',
      category: '번역',
      confidence: 0.9
    });
  }

  // 4. 검색 감지
  if (/검색|찾아|알아봐|search|google|네이버|다음/i.test(text)) {
    const searchKeyword = text
      .replace(/검색|찾아|알아봐|search|google|네이버|다음|해줘|하자/gi, '')
      .trim();
    
    suggestions.push({
      type: 'search',
      text: '🔍 웹 검색하기',
      result: `검색을 진행합니다: ${searchKeyword}`,
      icon: '🔍',
      category: '검색',
      keyword: searchKeyword,
      confidence: 0.8
    });
  }

  // 5. 계산 감지
  if (/계산|더하기|빼기|곱하기|나누기|몇.*이야|얼마야|\+|\-|\*|\/|\=|[0-9]+.*[+\-*/].*[0-9]/i.test(text)) {
    suggestions.push({
      type: 'calculation',
      text: '🔢 계산하기',
      result: '계산을 진행합니다',
      icon: '🔢',
      category: '계산',
      confidence: 0.85
    });
  }

  // 6. 환율 감지
  if (/환율|달러|엔|유로|원|currency|exchange|usd|jpy|eur|krw/i.test(text)) {
    suggestions.push({
      type: 'currency',
      text: '💱 환율 확인하기',
      result: '환율 정보를 확인합니다',
      icon: '💱',
      category: '환율',
      confidence: 0.8
    });
  }

  // 7. 뉴스 감지
  if (/뉴스|news|기사|최신|오늘.*소식|헤드라인|속보/i.test(text)) {
    suggestions.push({
      type: 'news',
      text: '📰 최신 뉴스 확인하기',
      result: '최신 뉴스를 검색합니다',
      icon: '📰',
      category: '뉴스',
      confidence: 0.75
    });
  }

  // 8. 요약 감지
  if (/요약|정리|summary|간단히|핵심만|중요한.*것만/i.test(text)) {
    suggestions.push({
      type: 'summary',
      text: '📝 텍스트 요약하기',
      result: '요약을 진행합니다',
      icon: '📝',
      category: '요약',
      confidence: 0.8
    });
  }

  return suggestions;
};

// 스마트 추천 처리 함수 - 자동 실행되는 추천들
export const processSmartSuggestion = async (
  suggestion: SmartSuggestion,
  originalText: string,
  chatRoomId: number,
  userId: number,
  callbacks: {
    showYoutubeModal?: (keyword: string, chatRoomId: number) => void;
    shareLocation?: (chatRoomId: number, userId: number) => void;
    showApiModal?: (suggestion: SmartSuggestion, originalText: string) => void;
  }
): Promise<void> => {
  console.log('🤖 Processing smart suggestion:', suggestion.type, 'for text:', originalText);

  switch (suggestion.type) {
    case 'youtube':
      if (callbacks.showYoutubeModal && suggestion.keyword) {
        callbacks.showYoutubeModal(suggestion.keyword, chatRoomId);
      }
      break;

    case 'location':
      if (callbacks.shareLocation) {
        callbacks.shareLocation(chatRoomId, userId);
      }
      break;

    case 'translation':
    case 'search':
    case 'calculation':
    case 'currency':
    case 'news':
    case 'summary':
      // API 호출이 필요한 스마트 추천들
      if (callbacks.showApiModal) {
        callbacks.showApiModal(suggestion, originalText);
      }
      break;

    default:
      console.log('Unknown suggestion type:', suggestion.type);
  }
};

// 환전 감지 함수 (ChatArea 호환성)
export const detectCurrency = (text: string) => {
  const currencyPatterns = [
    /(\d+(?:\.\d+)?)\s*(달러|dollar|usd)/i,
    /(\d+(?:\.\d+)?)\s*(엔|yen|jpy)/i,
    /(\d+(?:\.\d+)?)\s*(유로|euro|eur)/i,
    /(\d+(?:\.\d+)?)\s*(원|krw)/i
  ];

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        amount: parseFloat(match[1]),
        currency: match[2].toLowerCase(),
        originalText: match[0]
      };
    }
  }
  return null;
};

// URL 감지 함수
export const detectUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// 욕설 감지 함수 (기본적인 패턴만)
export const detectProfanity = (text: string): boolean => {
  const profanityPatterns = [
    /시발|씨발|개새끼|병신|바보|멍청이/i
  ];
  
  return profanityPatterns.some(pattern => pattern.test(text));
};