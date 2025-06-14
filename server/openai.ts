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

export interface BusinessCardData {
  name?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
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
    industry?: string;
    department?: string;
    tags?: string[];
    language?: string;
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
          content: `You are an expert at analyzing business cards from multiple languages including Korean, English, Japanese, Chinese, and other languages. 
          Extract the following information from the business card with high accuracy:
          - name: Person's full name
          - title: Job title/position  
          - company: Company/organization name
          - email: Email address
          - phone: Phone number (format consistently)
          - address: Physical address
          - website: Website URL
          - industry: Industry category (e.g., "Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Consulting", "Real Estate", "Legal", "Marketing", "Retail")
          - department: Department/division if mentioned
          - tags: Array of relevant tags based on industry, role, and company type
          
          For multi-language cards:
          - Detect the primary language(s) used
          - Preserve original text formatting when possible
          - Handle mixed scripts (e.g., Korean company name with English email)
          - Normalize phone numbers to international format when country is identifiable
          
          Return response in JSON format. Use null for missing information. Ensure tags are relevant and specific to the person's role and industry.`
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
  } catch (error: any) {
    console.error('Business card analysis failed:', error);
    return {
      success: false,
      error: `명함 분석 실패: ${error?.message || 'Unknown error'}`
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
  } catch (error: any) {
    console.error('One pager generation failed:', error);
    return {
      success: false,
      error: `원페이저 생성 실패: ${error?.message || 'Unknown error'}`
    };
  }
}

// Detect business card boundaries automatically using OpenAI Vision
export async function detectBusinessCardBounds(base64Image: string): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null> {
  try {
    console.log("Starting automatic business card boundary detection");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert business card detection system. Your task is to find the exact rectangular boundary of a business card in the image.

          Important guidelines:
          - Look for a rectangular card with text, logos, or contact information
          - The card may be at any angle or position in the image  
          - Focus on the card's physical edges, not just text areas
          - Include the entire card surface including margins and borders
          - Exclude backgrounds, hands, desks, or other objects completely
          - If the card occupies most of the image, reflect that accurately
          - Business cards are typically rectangular with a 3.5:2 or similar aspect ratio
          
          Return JSON in this exact format:
          {
            "x": number (left edge percentage 0-100),
            "y": number (top edge percentage 0-100), 
            "width": number (width percentage 0-100),
            "height": number (height percentage 0-100),
            "confidence": number (0-100)
          }
          
          If no business card is clearly visible, return: {"bounds": null, "confidence": 0}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image carefully and detect the precise rectangular boundaries of the business card. Focus on finding the actual card edges that define the complete card area, including any white space or margins within the card itself."
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
      max_tokens: 300
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return null;
    }

    const result = JSON.parse(content);
    console.log("Boundary detection result:", result);
    
    // Check if bounds were detected with confidence threshold
    if (result.bounds === null || !result.x || !result.y || !result.width || !result.height || (result.confidence && result.confidence < 60)) {
      console.log("No reliable business card boundary detected");
      return null;
    }

    // Validate and normalize the coordinates
    const bounds = {
      x: Math.max(0, Math.min(100, parseFloat(result.x))),
      y: Math.max(0, Math.min(100, parseFloat(result.y))),
      width: Math.max(5, Math.min(100, parseFloat(result.width))),
      height: Math.max(5, Math.min(100, parseFloat(result.height)))
    };

    // Ensure bounds don't exceed image boundaries
    bounds.width = Math.min(bounds.width, 100 - bounds.x);
    bounds.height = Math.min(bounds.height, 100 - bounds.y);

    // Validate reasonable card proportions (business cards are typically 3.5:2 ratio)
    const aspectRatio = bounds.width / bounds.height;
    if (aspectRatio < 0.5 || aspectRatio > 3.0) {
      console.log("Detected bounds have unrealistic aspect ratio:", aspectRatio);
      // Don't return null, but log the warning
    }

    console.log(`Normalized bounds: x=${bounds.x}%, y=${bounds.y}%, w=${bounds.width}%, h=${bounds.height}%, confidence=${result.confidence || 'N/A'}`);
    return bounds;
  } catch (error: any) {
    console.error("Error detecting business card bounds:", error);
    return null;
  }
}

// Business card information extraction using OpenAI Vision API
export async function extractBusinessCardInfo(base64Image: string): Promise<BusinessCardData> {
  try {
    console.log("Starting business card analysis with OpenAI Vision API");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional business card information extractor. Analyze the business card image and extract all relevant information. Return the result as a JSON object with the following fields: name, company, jobTitle, email, phone, website, address. Only include fields that are clearly visible on the card. If a field is not present or unclear, omit it from the response.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract all information from this business card image and return it as JSON."
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
      max_tokens: 1000,
    });

    console.log("OpenAI Response:", JSON.stringify(response, null, 2));
    
    const extractedText = response.choices[0]?.message?.content;
    if (!extractedText) {
      console.error("OpenAI response structure:", response);
      throw new Error("No content received from OpenAI");
    }

    const businessCardData = JSON.parse(extractedText) as BusinessCardData;
    console.log("Business card analysis completed successfully:", businessCardData);
    
    return businessCardData;
  } catch (error: any) {
    console.error("Business card extraction error:", error);
    throw new Error(`Failed to extract business card information: ${error.message}`);
  }
}

// Generate intelligent tags based on business card data
export async function generateSmartTags(businessCardData: BusinessCardData): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert at generating relevant tags for business contacts based on their professional information. 
          Generate 3-8 specific, useful tags that help categorize and find this contact later.
          
          Consider:
          - Industry-specific terms
          - Job function/role level
          - Company type/size indicators
          - Geographic location if relevant
          - Specialization areas
          - Technology stack (for tech contacts)
          - Professional interests/focus areas
          
          Return only an array of strings in JSON format: ["tag1", "tag2", "tag3"]
          
          Make tags concise (1-3 words), specific, and professionally relevant.`
        },
        {
          role: "user",
          content: `Generate smart tags for this contact:
          Name: ${businessCardData.name || 'N/A'}
          Company: ${businessCardData.company || 'N/A'}
          Job Title: ${businessCardData.jobTitle || 'N/A'}
          Industry: ${businessCardData.industry || 'N/A'}
          Email: ${businessCardData.email || 'N/A'}
          Phone: ${businessCardData.phone || 'N/A'}
          Website: ${businessCardData.website || 'N/A'}
          Address: ${businessCardData.address || 'N/A'}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tags": []}');
    return Array.isArray(result) ? result : (result.tags || []);
  } catch (error: any) {
    console.error("Tag generation error:", error);
    // Return basic fallback tags based on available data
    const fallbackTags = [];
    if (businessCardData.industry) fallbackTags.push(businessCardData.industry);
    if (businessCardData.company) fallbackTags.push(businessCardData.company);
    if (businessCardData.jobTitle) {
      if (businessCardData.jobTitle.toLowerCase().includes('manager')) fallbackTags.push('Management');
      if (businessCardData.jobTitle.toLowerCase().includes('developer')) fallbackTags.push('Technology');
      if (businessCardData.jobTitle.toLowerCase().includes('sales')) fallbackTags.push('Sales');
    }
    return fallbackTags.slice(0, 5);
  }
}

// Analyze contact priority and suggest follow-up actions
export async function analyzeContactPriority(contacts: Array<{
  id: number;
  name: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  tags?: string[];
  lastContactDate?: Date;
  createdAt: Date;
}>): Promise<Array<{
  contactId: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedAction: string;
  daysSinceLastContact?: number;
}>> {
  try {
    const contactAnalysis = contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      company: contact.company || 'N/A',
      jobTitle: contact.jobTitle || 'N/A',
      industry: contact.industry || 'N/A',
      tags: contact.tags || [],
      daysSinceCreated: Math.floor((Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      daysSinceLastContact: contact.lastContactDate 
        ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing business contacts and suggesting follow-up priorities.
          
          Analyze each contact and assign priority levels based on:
          - Industry importance and networking value
          - Job title/seniority level
          - Time since last contact (if available)
          - Time since first meeting
          - Professional relevance
          
          Priority Levels:
          - HIGH: Key decision makers, valuable industry connections, or overdue follow-ups
          - MEDIUM: Important contacts worth maintaining regular contact
          - LOW: General networking contacts for occasional touch-base
          
          Suggested Actions:
          - "Schedule meeting" for high-value prospects
          - "Send follow-up message" for recent connections
          - "Share relevant content" for industry peers
          - "Check-in call" for existing relationships
          - "Send connection request" for new contacts
          
          Return JSON array with: [{"contactId": number, "priority": string, "reason": string, "suggestedAction": string, "daysSinceLastContact": number}]`
        },
        {
          role: "user",
          content: `Analyze these contacts for follow-up priority:
          ${JSON.stringify(contactAnalysis, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{"priorities": []}');
    return result.priorities || result || [];
  } catch (error: any) {
    console.error("Contact priority analysis error:", error);
    // Return basic priority analysis as fallback
    return contacts.map(contact => {
      const daysSinceCreated = Math.floor((Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceLastContact = contact.lastContactDate 
        ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      let reason = 'General networking contact';
      let suggestedAction = 'Send connection message';
      
      // Simple heuristic-based priority
      if (contact.jobTitle?.toLowerCase().includes('ceo') || 
          contact.jobTitle?.toLowerCase().includes('founder') ||
          contact.jobTitle?.toLowerCase().includes('director')) {
        priority = 'high';
        reason = 'Senior executive - high networking value';
        suggestedAction = 'Schedule meeting';
      } else if (daysSinceLastContact && daysSinceLastContact > 30) {
        priority = 'medium';
        reason = `No contact for ${daysSinceLastContact} days`;
        suggestedAction = 'Send follow-up message';
      } else if (daysSinceCreated <= 7) {
        priority = 'medium';
        reason = 'Recent connection - maintain momentum';
        suggestedAction = 'Send follow-up message';
      }
      
      return {
        contactId: contact.id,
        priority,
        reason,
        suggestedAction,
        daysSinceLastContact
      };
    });
  }
}