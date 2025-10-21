import OpenAI from "openai";
import fs from "fs";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000 // 30 second timeout
});

// Test if API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set");
} else {
  console.log("OpenAI API key is configured");
}

export interface CommandResponse {
  success: boolean;
  content: string;
  type: 'text' | 'json';
}

// /translate command - translate text to specified language
export async function translateText(text: string, targetLanguage: string = 'English'): Promise<CommandResponse> {
  try {
    console.log(`Attempting translation: "${text}" to ${targetLanguage}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.`
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 1000,
    });

    console.log("OpenAI response received successfully");
    return {
      success: true,
      content: response.choices[0].message.content || "Translation failed",
      type: 'text'
    };
  } catch (error: any) {
    console.error("Translation error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      error: error
    });
    
    return {
      success: false,
      content: `Translation failed: ${error.message || 'Unknown error'}`,
      type: 'text'
    };
  }
}

// /calculate command - perform mathematical calculations using JavaScript eval
export async function calculateExpression(expression: string): Promise<CommandResponse> {
  try {
    // 보안을 위해 허용된 문자만 필터링
    const sanitizedExpression = expression.replace(/[^0-9+\-*/.() ]/g, '');
    
    if (sanitizedExpression !== expression) {
      return {
        success: false,
        content: "Invalid characters in expression. Only numbers, +, -, *, /, (, ), and spaces are allowed.",
        type: 'text'
      };
    }

    // 빈 표현식 체크
    if (!sanitizedExpression.trim()) {
      return {
        success: false,
        content: "Please provide a mathematical expression to calculate.",
        type: 'text'
      };
    }

    // JavaScript의 eval을 사용하여 계산 (보안상 sanitized된 입력만 사용)
    const result = eval(sanitizedExpression);
    
    // 결과가 유효한 숫자인지 확인
    if (typeof result !== 'number' || isNaN(result)) {
      return {
        success: false,
        content: "Invalid mathematical expression.",
        type: 'text'
      };
    }

    // 숫자 포맷팅 (큰 숫자는 콤마 추가)
    const formattedResult = result.toLocaleString();

    return {
      success: true,
      content: formattedResult,
      type: 'text'
    };
  } catch (error) {
    return {
      success: false,
      content: "Error calculating expression. Please check your syntax.",
      type: 'text'
    };
  }
}

// /summarize command - summarize text
export async function summarizeText(text: string): Promise<CommandResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a text summarizer. Provide a concise summary of the following text. Keep it brief and capture the main points."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 300,
    });

    return {
      success: true,
      content: response.choices[0].message.content || "Summarization failed",
      type: 'text'
    };
  } catch (error) {
    return {
      success: false,
      content: "Summarization service unavailable",
      type: 'text'
    };
  }
}

// /vibe command - analyze sentiment/vibe of text
export async function analyzeVibe(text: string): Promise<CommandResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analyzer. Analyze the vibe/sentiment of the text and provide a rating from 1-5 stars and describe the emotional tone. Respond with JSON in this format: { 'rating': number, 'emotion': string, 'description': string }"
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const stars = '⭐'.repeat(Math.max(1, Math.min(5, result.rating || 3)));
    
    return {
      success: true,
      content: `${stars} ${result.emotion || 'Neutral'}\n${result.description || 'Unable to analyze sentiment'}`,
      type: 'text'
    };
  } catch (error) {
    return {
      success: false,
      content: "Vibe analysis service unavailable",
      type: 'text'
    };
  }
}

// /poll command - create a poll
export async function createPoll(question: string, options: string[]): Promise<CommandResponse> {
  try {
    if (options.length < 2) {
      return {
        success: false,
        content: "Poll needs at least 2 options. Format: /poll Question? Option1,Option2,Option3",
        type: 'text'
      };
    }

    const pollData = {
      question: question.trim(),
      options: options.map((opt, index) => ({
        id: index + 1,
        text: opt.trim(),
        votes: 0
      })),
      totalVotes: 0,
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      content: JSON.stringify(pollData),
      type: 'json'
    };
  } catch (error) {
    return {
      success: false,
      content: "Failed to create poll",
      type: 'text'
    };
  }
}

// Command parser to handle different command types
export async function processCommand(commandText: string): Promise<CommandResponse> {
  const parts = commandText.trim().split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (command) {
    case '/translate':
      const translateParts = args.split(' to ');
      if (translateParts.length === 2) {
        return translateText(translateParts[0], translateParts[1]);
      }
      return translateText(args);

    case '/calculate':
    case '/calc':
      return calculateExpression(args);

    case '/summarize':
      return summarizeText(args);

    case '/vibe':
      return analyzeVibe(args);

    case '/poll':
      const pollParts = args.split('?');
      if (pollParts.length !== 2) {
        return {
          success: false,
          content: "Poll format: /poll Question? Option1,Option2,Option3",
          type: 'text'
        };
      }
      const question = pollParts[0] + '?';
      const options = pollParts[1].split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
      return createPoll(question, options);

    default:
      return {
        success: false,
        content: `Unknown command: ${command}\n\nAvailable commands:\n/translate [text] (to [language])\n/calculate [expression]\n/summarize [text]\n/vibe [text]\n/poll [question]? [option1,option2,option3]`,
        type: 'text'
      };
  }
}

// Audio transcription for voice messages
export async function transcribeAudio(filePath: string): Promise<{ 
  success: boolean, 
  transcription?: string, 
  duration?: number, 
  detectedLanguage?: string,
  confidence?: number,
  error?: string 
}> {
  try {
    console.log("Starting audio transcription with language detection...");
    console.log("Audio file path:", filePath);
    
    // Read file as buffer and detect proper audio format
    const audioBuffer = fs.readFileSync(filePath);
    console.log("Audio buffer read successfully, size:", audioBuffer.length, "bytes");
    
    // iPhone PWA enhanced audio format detection
    let mimeType = "audio/webm";
    let fileName = "audio.webm";
    
    // Check file extension for proper format detection
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // iPhone PWA audio format priority handling
    if (fileExtension === '.mp4' || fileExtension === '.m4a') {
      mimeType = "audio/mp4";
      fileName = "audio.mp4";
      console.log("🎤 iPhone PWA audio format detected: MP4");
    } else if (fileExtension === '.wav') {
      mimeType = "audio/wav";
      fileName = "audio.wav";
      console.log("🎤 WAV audio format detected");
    } else if (fileExtension === '.ogg') {
      mimeType = "audio/ogg";
      fileName = "audio.ogg";
      console.log("🎤 OGG audio format detected");
    } else {
      // For iPhone PWA, prefer MP4 as fallback
      console.log("🎤 Unknown format, using iPhone PWA compatible MP4 fallback");
      mimeType = "audio/mp4";
      fileName = "audio.mp4";
    }
    
    // Additional validation for iPhone PWA audio
    if (audioBuffer.length < 1024) {
      console.log("⚠️ Audio buffer very small, likely silent recording");
      return {
        success: false,
        transcription: "",
        detectedLanguage: "ko",
        duration: 0,
        confidence: 0,
        error: "SILENT_RECORDING"
      };
    }
    
    console.log(`Using audio format: ${mimeType} for file: ${fileName} (${audioBuffer.length} bytes)`);
    
    // Create a Blob with proper MIME type
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    
    // Create FormData for OpenAI API with proper filename and format
    const formData = new FormData();
    formData.append("file", audioBlob, fileName);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("language", "ko"); // Set default language to Korean for better iPhone PWA performance
    
    console.log("FormData prepared for OpenAI API");
    
    // Make direct fetch request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", response.status, errorText);
      
      // Handle audio too short error as silent recording
      if (errorText.includes("Audio file is too short") || errorText.includes("audio_too_short")) {
        console.log("🔇 Audio file too short, treating as silent recording");
        return {
          success: false,
          transcription: "",
          detectedLanguage: "ko",
          duration: 0,
          confidence: 0,
          error: "SILENT_RECORDING"
        };
      }
      
      throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
    }
    
    const transcription = await response.json();
    console.log("Direct API call successful");

    console.log("Audio transcription completed:", {
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration
    });
    
    // Map language codes to readable names
    const languageNames: { [key: string]: string } = {
      'ko': '한국어',
      'en': 'English', 
      'hu': 'Magyar',
      'de': 'Deutsch',
      'ja': '日本語',
      'zh': '中文',
      'es': 'Español',
      'fr': 'Français',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский'
    };
    
    const detectedLanguage = languageNames[transcription.language] || transcription.language;
    const transcribedText = transcription.text || "";
    
    // Check if transcription contains meaningful content
    const isEmptyOrNoise = (text: string): boolean => {
      if (!text || text.trim().length === 0) return true;
      
      // Enhanced iPhone PWA noise patterns - comprehensive hallucination detection
      const noisePatterns = [
        /^[\s.,!?]*$/,  // Only punctuation and whitespace
        /^(um|uh|ah|eh|hmm|mm|아|어|음|으|아우|어우|음\.\.\.|\.\.\.)+[\s.,!?]*$/i,  // Filler sounds
        /^[\uD83C-\uDBFF\uDC00-\uDFFF]+[\s.,!?]*$/,  // Only emojis
        /^[📢🎵🎤🔊🔇📻]+[\s.,!?]*$/,  // Audio/sound emojis
        /thank you|감사합니다|고마워|sorry|죄송|미안/i,  // Common polite expressions that might be background audio
        // Enhanced news anchor patterns (iPhone PWA Whisper hallucination)
        /MBC.*뉴스.*입니다|KBS.*뉴스|SBS.*뉴스|뉴스데스크|뉴스룸/i,
        /이덕영입니다|이덕영.*뉴스|뉴스.*이덕영/i,  // Specific iPhone PWA hallucination pattern
        /앵커.*입니다|기자.*입니다|아나운서.*입니다|캐스터.*입니다/i,  // News presenter patterns
        /오늘.*뉴스|지금.*뉴스|다음.*뉴스|이어서.*뉴스/i,  // News timing patterns
        /안녕하세요.*입니다|여러분.*입니다|시청해.*주셔서/i,  // Generic formal greeting patterns
        /방송.*시작|프로그램.*시작|뉴스.*시작|방송.*드리겠습니다/i,  // Broadcasting start patterns
        /^(네|예|아|어|음|그|저|뭐|잠깐|잠시|어서|이제|그럼|그래서)[\s.,!?]*$/i,  // Single Korean filler words
        // iPhone PWA specific detection patterns
        /^(테스트|test|시작|start|음성|voice|녹음|record|hello|hi)[\s.,!?]*$/i,  // Test/start words
        /잠깐만요|죄송합니다|실례합니다|실례하겠습니다/i,  // Polite interruptions
        /^.{1,4}[\s.,!?]*$/i,  // Very short meaningless utterances (1-4 characters)
        /반갑습니다|만나서.*반갑습니다|처음.*뵙겠습니다/i  // Generic greetings
      ];
      
      // Check text length (very short transcriptions are likely noise)
      if (text.trim().length < 5) return true;
      
      // Check against noise patterns
      return noisePatterns.some(pattern => pattern.test(text.trim()));
    };
    
    // If transcription is empty or just noise, return cancellation response
    if (isEmptyOrNoise(transcribedText)) {
      console.log("🔇 Voice recording contains no meaningful speech, canceling message");
      return {
        success: false,
        transcription: "",
        error: "SILENT_RECORDING", // Special error code for silent recordings
        duration: transcription.duration || 0,
        detectedLanguage,
        confidence: 0
      };
    }
    
    return {
      success: true,
      transcription: transcribedText,
      duration: transcription.duration || 0,
      detectedLanguage,
      confidence: 0.9 // Whisper doesn't provide confidence scores, but it's generally reliable
    };
  } catch (error: any) {
    console.error("Audio transcription error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      error: error
    });
    
    return {
      success: false,
      error: `음성 변환 실패: ${error.message || 'Unknown error'}`
    };
  }
}

// 파일 요약 생성 함수
export async function generateFileSummary(fileName: string, fileType: string, fileContent?: string): Promise<string> {
  try {
    console.log(`Generating file summary for: ${fileName} (${fileType})`);
    
    let prompt = `다음 파일에 대한 아주 간단한 요약을 한 줄로 작성해주세요. 15자 이내로 핵심 내용만 설명하세요.
파일명: ${fileName}
파일 유형: ${fileType}`;

    if (fileContent) {
      prompt += `\n파일 내용: ${fileContent.substring(0, 1000)}...`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "당신은 파일 내용을 간단히 요약하는 전문가입니다. 15자 이내로 핵심만 설명하세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 30,
      temperature: 0.3
    });

    const summary = response.choices[0].message.content?.trim() || "파일";
    console.log(`File summary generated: "${summary}"`);
    
    return summary;
  } catch (error: any) {
    console.error("File summary generation error:", error);
    
    // 파일 확장자로 기본 설명 제공
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF 문서';
      case 'doc':
      case 'docx': return 'Word 문서';
      case 'xls':
      case 'xlsx': return 'Excel 파일';
      case 'ppt':
      case 'pptx': return 'PPT 파일';
      case 'txt': return '텍스트 파일';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '이미지';
      case 'mp4':
      case 'avi':
      case 'mov': return '동영상';
      case 'mp3':
      case 'wav': return '음성 파일';
      case 'zip':
      case 'rar': return '압축 파일';
      default: return '파일';
    }
  }
}

// AI Chat Assistant - Answer questions based on chat room context
export async function answerChatQuestion(
  question: string,
  chatMessages: Array<{ senderName: string; content: string; createdAt: string; messageType?: string }>
): Promise<CommandResponse> {
  try {
    console.log(`AI Chat Assistant: Answering question with ${chatMessages.length} messages as context`);
    
    // Prepare chat context from messages
    const chatContext = chatMessages
      .slice(-100) // Use last 100 messages for context
      .map(msg => {
        const date = new Date(msg.createdAt).toLocaleString('ko-KR');
        const content = msg.messageType === 'file' ? '[파일]' : 
                       msg.messageType === 'voice' ? '[음성 메시지]' : 
                       msg.messageType === 'image' ? '[이미지]' : 
                       msg.content;
        return `[${date}] ${msg.senderName}: ${content}`;
      })
      .join('\n');
    
    if (!chatContext.trim()) {
      return {
        success: false,
        content: "아직 대화 내용이 없어서 답변할 수 없습니다. 채팅을 시작한 후 다시 질문해주세요.",
        type: 'text'
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 Dovie Messenger의 AI 어시스턴트입니다. 채팅방의 대화 내용을 분석하여 사용자의 질문에 정확하고 친절하게 답변하세요.

답변 가이드라인:
1. 채팅 기록에 명확한 정보가 있으면 정확히 인용하여 답변하세요
2. 날짜, 시간, 이름 등 구체적인 정보를 포함하세요
3. 정보가 불확실하거나 없으면 솔직히 말하세요
4. 친근하고 자연스러운 한국어로 대화하세요
5. 답변은 간결하고 명확하게 작성하세요 (3-4 문장 이내)

예시:
질문: "수진이 생일이 언제야?"
답변: "채팅 기록을 보니 1월 15일에 수진님이 '내일이 내 생일이야'라고 하셨어요. 그러니까 수진님 생일은 1월 16일입니다!"

질문: "내일 뭐한다고 했지?"
답변: "어제 대화에서 '내일 저녁 7시에 강남역에서 만나자'고 약속하셨네요. 잊지 마세요!"

질문: "지난주에 무슨 영화 봤어?"
답변: "죄송하지만 채팅 기록에 영화에 대한 대화가 없어서 확인할 수 없습니다."`
        },
        {
          role: "user",
          content: `채팅 기록:\n${chatContext}\n\n질문: ${question}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const answer = response.choices[0].message.content?.trim();
    
    if (!answer) {
      return {
        success: false,
        content: "답변을 생성하지 못했습니다. 다시 시도해주세요.",
        type: 'text'
      };
    }

    console.log("AI Chat Assistant: Answer generated successfully");
    
    return {
      success: true,
      content: answer,
      type: 'text'
    };
  } catch (error: any) {
    console.error("AI Chat Assistant error:", {
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    return {
      success: false,
      content: `AI 답변 실패: ${error.message || 'Unknown error'}. 잠시 후 다시 시도해주세요.`,
      type: 'text'
    };
  }
}

// Analyze message content and suggest personalized emoji reactions
export async function analyzeMessageForEmojiSuggestions(
  messageContent: string, 
  messageType: string = 'text',
  senderContext?: string
): Promise<{ success: boolean; suggestions: Array<{ emoji: string; name: string; confidence: number }> }> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert emoji suggestion system. Analyze the given message content and suggest 3-5 most relevant emoji reactions that users might want to use to react to this message.

Consider:
- Message sentiment and emotion
- Content topic and context
- Cultural appropriateness (Korean/international context)
- Popular reaction patterns on messaging apps

Return your response in JSON format with this structure:
{
  "suggestions": [
    {
      "emoji": "😀",
      "name": "grinning_face",
      "confidence": 0.85
    }
  ]
}

Prioritize commonly used reaction emojis like: ❤️, 😂, 😢, 😮, 👍, 👎, 🔥, 💯, 🎉, 😍, 🤔, 😡, 😭, 🙏, 👏, etc.`
        },
        {
          role: "user",
          content: `Analyze this ${messageType} message and suggest emoji reactions: "${messageContent}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    
    // Validate and filter suggestions
    const validSuggestions = (result.suggestions || [])
      .filter((s: any) => s.emoji && s.name && typeof s.confidence === 'number')
      .slice(0, 5); // Limit to 5 suggestions

    return {
      success: true,
      suggestions: validSuggestions
    };
    
  } catch (error) {
    console.error('Error analyzing message for emoji suggestions:', error);
    
    // Return default popular reactions as fallback
    return {
      success: false,
      suggestions: [
        { emoji: "❤️", name: "heart", confidence: 0.7 },
        { emoji: "😂", name: "joy", confidence: 0.6 },
        { emoji: "👍", name: "thumbs_up", confidence: 0.6 },
        { emoji: "😮", name: "open_mouth", confidence: 0.5 }
      ]
    };
  }
}

// Analyze message for important notices (appointments, schedules, deadlines, important info)
export async function analyzeMessageForNotices(
  messageContent: string,
  senderName: string,
  chatRoomName: string
): Promise<{
  success: boolean;
  hasNotice: boolean;
  notices: Array<{
    type: 'appointment' | 'schedule' | 'reminder' | 'important_info' | 'deadline';
    content: string;
    metadata?: {
      date?: string;
      time?: string;
      location?: string;
      participants?: string[];
      priority?: 'low' | 'medium' | 'high';
    };
  }>;
}> {
  try {
    console.log(`Analyzing message for notices: "${messageContent}"`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 채팅 메시지를 분석하여 중요한 알림을 감지하는 AI입니다.

다음과 같은 정보를 감지하고 JSON 형식으로 반환하세요:

1. **appointment** (약속): 특정 시간과 장소에서 만나는 약속
   예: "내일 3시에 강남역에서 보자", "다음주 월요일 저녁 7시 회의"

2. **schedule** (일정): 특정 날짜에 해야 할 일이나 행사
   예: "이번 주말에 여행 가자", "다음달 15일이 발표날"

3. **deadline** (마감): 특정 날짜까지 완료해야 하는 일
   예: "금요일까지 보고서 제출", "내일까지 결제해야 해"

4. **reminder** (리마인더): 잊지 말아야 할 중요한 사항
   예: "엄마 생일 잊지마", "내일 택배 받아야 해"

5. **important_info** (중요 정보): 기억해야 할 중요한 정보
   예: "비밀번호는 1234야", "회의실은 3층이야"

분석 규칙:
- 일상적인 대화는 무시 (예: "안녕", "뭐해?", "ㅋㅋㅋ")
- 명확한 날짜/시간이 있는 경우 metadata에 포함
- 장소 정보가 있으면 location에 포함
- 참석자 정보가 있으면 participants에 포함
- 긴급도에 따라 priority 설정 (high/medium/low)

응답 형식:
{
  "hasNotice": true/false,
  "notices": [
    {
      "type": "appointment",
      "content": "간결한 알림 내용 (한 문장)",
      "metadata": {
        "date": "2024-01-15",
        "time": "15:00",
        "location": "강남역",
        "participants": ["수진", "민수"],
        "priority": "high"
      }
    }
  ]
}`
        },
        {
          role: "user",
          content: `채팅방: ${chatRoomName}
보낸 사람: ${senderName}
메시지: "${messageContent}"

이 메시지에서 중요한 알림을 추출하세요.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{"hasNotice": false, "notices": []}');

    console.log(`AI Notice Analysis Result:`, result);

    return {
      success: true,
      hasNotice: result.hasNotice || false,
      notices: result.notices || []
    };

  } catch (error: any) {
    console.error("AI Notice Analysis error:", {
      message: error.message,
      status: error.status,
      code: error.code
    });

    return {
      success: false,
      hasNotice: false,
      notices: []
    };
  }
}

// AI Voice Enhancement - Correct transcription using chat context
export async function correctTranscriptionWithContext(
  transcription: string,
  chatMessages: Array<{ senderName: string; content: string; createdAt: string; messageType?: string }>,
  senderName: string
): Promise<{ success: boolean; correctedText?: string; error?: string }> {
  try {
    console.log(`AI Voice Enhancement: Correcting transcription with ${chatMessages.length} messages as context`);
    
    // Extract user's speaking style from their previous messages
    const userMessages = chatMessages
      .filter(msg => msg.senderName === senderName && msg.messageType === 'text')
      .slice(-20) // Last 20 text messages from the user (reduced from 50)
      .map(msg => msg.content);
    
    // Prepare recent chat context for understanding topic (with character limit)
    const MAX_CONTEXT_CHARS = 2000;
    let recentContextMessages = chatMessages
      .slice(-20) // Last 20 messages for context (reduced from 30)
      .map(msg => {
        const content = msg.messageType === 'file' ? '[파일]' : 
                       msg.messageType === 'voice' ? '[음성 메시지]' : 
                       msg.messageType === 'image' ? '[이미지]' : 
                       msg.content;
        return `${msg.senderName}: ${content}`;
      });
    
    // Truncate context if too long to avoid token limits
    let recentContext = recentContextMessages.join('\n');
    if (recentContext.length > MAX_CONTEXT_CHARS) {
      // Take only the most recent messages that fit within the limit
      recentContext = recentContextMessages
        .reverse()
        .reduce((acc, msg) => {
          if ((acc + msg).length < MAX_CONTEXT_CHARS) {
            return msg + '\n' + acc;
          }
          return acc;
        }, '')
        .trim();
    }
    
    // Limit user style context
    const MAX_STYLE_CHARS = 1000;
    let userStyleContext = '';
    if (userMessages.length > 0) {
      const styleMessages = userMessages.slice(-5).join('\n'); // Reduced from 10
      userStyleContext = `\n\n사용자의 평소 말투 예시:\n${
        styleMessages.length > MAX_STYLE_CHARS 
          ? styleMessages.substring(0, MAX_STYLE_CHARS) + '...' 
          : styleMessages
      }`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 음성 인식 텍스트를 보정하는 AI입니다. 채팅 히스토리와 사용자의 말투를 분석하여 Whisper가 생성한 전사 텍스트의 오류를 수정하세요.

보정 가이드라인:
1. **맥락 기반 수정**: 최근 대화 주제와 맥락을 고려하여 단어를 수정
   - 예: "강남역" → "강남역" (지명 보정)
   - 예: "수진" → "수진" (이름 보정)

2. **사용자 말투 유지**: 사용자의 평소 말투와 문체를 분석하고 그대로 유지
   - 예: 평소 "~야"를 쓰면 그대로 유지
   - 예: 이모티콘을 자주 쓰면 적절히 추가

3. **띄어쓰기 및 맞춤법**: 자연스러운 한국어로 수정
   - 예: "안녕하세요만나서반가워요" → "안녕하세요 만나서 반가워요"

4. **동음이의어 구분**: 맥락을 고려하여 올바른 단어 선택
   - 예: "밤" (시간) vs "밤" (식품)
   - 예: "배" (신체) vs "배" (과일) vs "배" (배송)

5. **최소한의 수정**: 명백한 오류만 수정하고, 불필요한 변경은 하지 마세요
   - 전사 텍스트가 이미 정확하면 그대로 반환

6. **자연스러운 구어체**: 음성 메시지는 구어체이므로 너무 격식체로 바꾸지 마세요
   - 예: "했어" → "했어" (O), "했습니다" (X)

수정된 텍스트만 반환하세요. 설명이나 부가 정보는 포함하지 마세요.`
        },
        {
          role: "user",
          content: `최근 대화 맥락:\n${recentContext}${userStyleContext}\n\n음성 인식 텍스트:\n"${transcription}"\n\n위 텍스트를 맥락과 사용자 말투를 고려하여 보정하세요.`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const correctedText = response.choices[0].message.content?.trim();
    
    if (!correctedText) {
      return {
        success: false,
        error: "텍스트 보정 실패"
      };
    }

    console.log(`AI Voice Enhancement: Corrected "${transcription}" → "${correctedText}"`);
    
    return {
      success: true,
      correctedText
    };
  } catch (error: any) {
    console.error("AI Voice Enhancement error:", {
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    return {
      success: false,
      error: `AI 음성 보정 실패: ${error.message || 'Unknown error'}`
    };
  }
}