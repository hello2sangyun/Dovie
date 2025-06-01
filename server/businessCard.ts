import QRCode from 'qrcode';
import sharp from 'sharp';
import crypto from 'crypto';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * QR 코드 생성
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`QR 코드 생성 실패: ${error.message}`);
  }
}

/**
 * 사용자 고유 QR 코드 데이터 생성
 */
export function generateUserQRData(userId: number, username: string): string {
  const qrData = {
    type: 'dovie_user',
    userId,
    username,
    timestamp: Date.now()
  };
  return JSON.stringify(qrData);
}

/**
 * 명함 이미지 최적화
 */
export async function optimizeBusinessCardImage(imagePath: string): Promise<string> {
  try {
    const outputPath = imagePath.replace(/\.[^/.]+$/, '_optimized.webp');
    
    await sharp(imagePath)
      .resize(800, 500, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`이미지 최적화 실패: ${error.message}`);
  }
}

/**
 * 명함 OCR 및 정보 추출
 */
export async function extractBusinessCardInfo(imagePath: string): Promise<{
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  address: string;
}> {
  try {
    // 이미지를 base64로 변환
    const imageBuffer = await sharp(imagePath).jpeg().toBuffer();
    const base64Image = imageBuffer.toString('base64');
    
    // OpenAI Vision API로 명함 분석
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "명함 이미지에서 다음 정보를 추출해주세요:\n- name: 성명\n- company: 회사명\n- position: 직책/직위\n- phone: 전화번호\n- email: 이메일 주소\n- address: 주소\n\n정보가 없으면 빈 문자열로 반환하세요. JSON 형식으로 응답해주세요."
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
    });

    const analysisText = response.choices[0].message.content || "";
    return parseBusinessCardAnalysis(analysisText);
  } catch (error: unknown) {
    console.error('명함 OCR 실패:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`명함 정보 추출 실패: ${errorMessage}`);
  }
}

/**
 * OpenAI 분석 결과에서 명함 정보 파싱
 */
function parseBusinessCardAnalysis(analysisText: string): {
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  address: string;
} {
  try {
    const parsed = JSON.parse(analysisText);
    
    return {
      name: parsed.name || parsed.fullName || parsed.personName || '',
      company: parsed.company || parsed.companyName || parsed.organization || '',
      position: parsed.position || parsed.jobTitle || parsed.title || parsed.role || '',
      phone: parsed.phone || parsed.phoneNumber || parsed.mobile || parsed.tel || '',
      email: parsed.email || parsed.emailAddress || '',
      address: parsed.address || parsed.location || parsed.officeAddress || ''
    };
  } catch (error: unknown) {
    console.error('명함 분석 결과 파싱 실패:', error);
    
    // Fallback: 텍스트에서 직접 추출
    const result = {
      name: '',
      company: '',
      position: '',
      phone: '',
      email: '',
      address: ''
    };
    
    // 이메일 추출
    const emailMatch = analysisText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    if (emailMatch) {
      result.email = emailMatch[0];
    }
    
    // 전화번호 추출 (한국 형식)
    const phoneMatch = analysisText.match(/(\+82|0)?\s?(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/g);
    if (phoneMatch) {
      result.phone = phoneMatch[0].replace(/[-\s]/g, '');
    }
    
    return result;
  }
}
}

/**
 * 명함 공유 토큰 생성
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 명함 공유 링크 생성
 */
export function generateBusinessCardShareLink(token: string): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  return `${baseUrl}/business-card/${token}`;
}