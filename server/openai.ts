import OpenAI from "openai";
import fs from "fs";

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

// Audio transcription for voice messages with integrated smart suggestions
export async function transcribeAudio(filePath: string): Promise<{ 
  success: boolean, 
  transcription?: string, 
  duration?: number, 
  detectedLanguage?: string,
  confidence?: number,
  smartSuggestions?: any[],
  error?: string 
}> {
  try {
    console.log("Starting audio transcription with language detection...");
    console.log("Audio file path:", filePath);
    
    // Read file as buffer and create FormData with proper filename
    const audioBuffer = fs.readFileSync(filePath);
    console.log("Audio buffer read successfully, size:", audioBuffer.length, "bytes");
    
    // Create a Blob with proper MIME type and filename
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
    console.log("Audio blob created with type audio/webm");
    
    // Create FormData for OpenAI API with proper filename
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    
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
          text: "",
          language: "ko",
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
      
      // Common noise patterns and meaningless transcriptions
      const noisePatterns = [
        /^[\s.,!?]*$/,  // Only punctuation and whitespace
        /^(um|uh|ah|eh|hmm|mm|아|어|음|으|아우|어우|음\.\.\.|\.\.\.)+[\s.,!?]*$/i,  // Filler sounds
        /^[\uD83C-\uDBFF\uDC00-\uDFFF]+[\s.,!?]*$/,  // Only emojis
        /^[📢🎵🎤🔊🔇📻]+[\s.,!?]*$/,  // Audio/sound emojis
        /thank you|감사합니다|고마워|sorry|죄송|미안/i  // Common polite expressions that might be background audio
      ];
      
      // Check text length (very short transcriptions are likely noise)
      if (text.trim().length < 3) return true;
      
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
        confidence: 0,
        smartSuggestions: []
      };
    }
    
    // Analyze transcribed text for smart suggestions using a single OpenAI call
    let smartSuggestions: any[] = [];
    if (transcribedText && transcribedText.length > 5) {
      console.log("🤖 Analyzing transcription for smart suggestions:", transcribedText);
      
      try {
        const analysisResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `당신은 음성 메시지 텍스트를 분석해서 사용자가 원하는 행동을 파악하는 AI입니다. 
              다음 카테고리 중에서 해당하는 것을 찾아 JSON으로 응답하세요:
              
              1. youtube: 유튜브 영상 검색/추천 (예: "지드래곤 유튜브", "상남자 영상", "유튜브로 검색", "영상 봐봐")
              2. location: 위치 공유/문의 (예: "어디야", "주소 알려줘", "어디로 가면 돼")
              3. translation: 번역 요청 (예: "영어로", "한국어로", "번역해줘")
              4. search: 검색 요청 (예: "검색해줘", "찾아봐")
              5. calculation: 계산 요청 (예: "계산해줘", "얼마야")
              6. currency: 환율 계산 (예: "달러", "원", "환율")
              7. news: 뉴스/정보 (예: "뉴스", "소식", "정보")
              
              응답 형식:
              {
                "suggestions": [
                  {
                    "type": "youtube",
                    "keyword": "추출된 키워드",
                    "confidence": 0.9,
                    "text": "🎥 YouTube에서 [키워드] 검색하기",
                    "icon": "🎥"
                  }
                ]
              }
              
              YouTube의 경우 검색할 키워드를 정확히 추출하세요.
              매칭되는 것이 없으면 빈 배열을 반환하세요.`
            },
            {
              role: "user",
              content: transcribedText
            }
          ],
          response_format: { type: "json_object" }
        });
        
        const analysisResult = JSON.parse(analysisResponse.choices[0].message.content || '{"suggestions":[]}');
        smartSuggestions = analysisResult.suggestions || [];
        
        console.log("🤖 Smart suggestions analysis completed:", smartSuggestions.length, "suggestions");
        
      } catch (analysisError) {
        console.error("Smart suggestions analysis failed:", analysisError);
        // Continue without suggestions rather than failing the whole transcription
      }
    }
    
    return {
      success: true,
      transcription: transcribedText,
      duration: transcription.duration || 0,
      detectedLanguage,
      confidence: 0.9, // Whisper doesn't provide confidence scores, but it's generally reliable
      smartSuggestions
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