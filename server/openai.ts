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

// 명함 이미지 분석 및 정보 추출
export async function analyzeBusinessCard(base64Image: string): Promise<{
  success: boolean;
  data?: {
    name: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    additionalInfo?: string;
  };
  error?: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `당신은 명함 이미지를 분석하여 정보를 추출하는 전문가입니다. 
          명함에서 다음 정보를 추출해주세요:
          - 이름 (name)
          - 직책/직위 (title)
          - 회사명 (company)
          - 이메일 (email)
          - 전화번호 (phone)
          - 주소 (address)
          - 웹사이트 (website)
          - 기타 정보 (additionalInfo)
          
          JSON 형태로 응답해주세요. 정보가 없는 경우 null로 표시하세요.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 명함 이미지에서 정보를 추출해주세요."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      success: true,
      data: {
        name: result.name || "",
        title: result.title || null,
        company: result.company || null,
        email: result.email || null,
        phone: result.phone || null,
        address: result.address || null,
        website: result.website || null,
        additionalInfo: result.additionalInfo || null
      }
    };
  } catch (error) {
    console.error('Business card analysis failed:', error);
    return {
      success: false,
      error: `명함 분석 실패: ${error.message}`
    };
  }
}

// 추출된 명함 정보로 원페이저 생성
export async function generateOnePager(cardData: {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  additionalInfo?: string;
}): Promise<{
  success: boolean;
  data?: {
    displayName: string;
    jobTitle: string;
    company: string;
    bio: string;
    skills: string[];
    website?: string;
    socialLinks?: { platform: string; url: string }[];
  };
  error?: string;
}> {
  try {
    const prompt = `다음 명함 정보를 바탕으로 전문적인 원페이저(디지털 명함) 정보를 생성해주세요:

명함 정보:
- 이름: ${cardData.name}
- 직책: ${cardData.title || '정보 없음'}
- 회사: ${cardData.company || '정보 없음'}
- 이메일: ${cardData.email || '정보 없음'}
- 전화번호: ${cardData.phone || '정보 없음'}
- 주소: ${cardData.address || '정보 없음'}
- 웹사이트: ${cardData.website || '정보 없음'}
- 기타: ${cardData.additionalInfo || '정보 없음'}

다음 형태로 생성해주세요:
- displayName: 전문적인 표시명
- jobTitle: 직책/직위 (정보가 없으면 직종 추정)
- company: 회사명 (정보가 없으면 "개인사업자" 또는 업종 추정)
- bio: 2-3문장의 전문적인 자기소개 (업무 경험과 전문성 강조)
- skills: 직책과 업종에 맞는 핵심 기술/역량 5-7개
- website: 웹사이트 URL (있는 경우만)
- socialLinks: 소셜미디어 링크 배열 (추정 가능한 경우만)

JSON 형태로 응답해주세요.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 전문적인 디지털 명함(원페이저) 생성 전문가입니다. 주어진 명함 정보를 바탕으로 매력적이고 전문적인 프로필을 생성합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      success: true,
      data: {
        displayName: result.displayName || cardData.name,
        jobTitle: result.jobTitle || cardData.title || "전문가",
        company: result.company || cardData.company || "개인사업자",
        bio: result.bio || `${cardData.name}님은 전문적인 업무 경험을 보유한 전문가입니다.`,
        skills: Array.isArray(result.skills) ? result.skills : ["전문성", "소통", "문제해결"],
        website: result.website || cardData.website || undefined,
        socialLinks: Array.isArray(result.socialLinks) ? result.socialLinks : undefined
      }
    };
  } catch (error) {
    console.error('One pager generation failed:', error);
    return {
      success: false,
      error: `원페이저 생성 실패: ${error.message}`
    };
  }
}