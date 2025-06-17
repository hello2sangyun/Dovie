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

// Audio transcription for voice messages with language detection
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
    
    return {
      success: true,
      transcription: transcription.text || "음성을 찾을 수 없습니다.",
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

export async function analyzeVoiceMood(text: string): Promise<string[]> {
  try {
    const prompt = `다음 음성 메시지 내용을 분석하여 어울리는 배경음악 무드를 추천해주세요.

음성 내용: "${text}"

사용 가능한 무드 옵션:
- calm: 차분하고 평온한 느낌
- happy: 즐겁고 활기찬 느낌  
- romantic: 따뜻하고 감성적인 느낌
- professional: 깔끔하고 신뢰감 있는 느낌
- energetic: 힘차고 에너지 넘치는 느낌
- mysterious: 몽환적이고 흥미로운 느낌

응답은 JSON 형식으로 추천 무드를 배열로 반환해주세요. 최대 3개까지 추천하되, 가장 적합한 순서로 정렬해주세요.
예시: {"moods": ["calm", "professional"]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"moods": ["calm"]}');
    return result.moods || ['calm'];
  } catch (error) {
    console.error('음성 무드 분석 실패:', error);
    return ['calm'];
  }
}