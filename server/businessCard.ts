import QRCode from 'qrcode';
import sharp from 'sharp';
import { analyzeImage } from './openai';
import crypto from 'crypto';

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
  companyName?: string;
  jobTitle?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  website?: string;
}> {
  try {
    // 이미지를 base64로 변환
    const imageBuffer = await sharp(imagePath).jpeg().toBuffer();
    const base64Image = imageBuffer.toString('base64');
    
    // OpenAI Vision API로 명함 분석
    const analysisResult = await analyzeImage(base64Image);
    
    // 분석 결과에서 명함 정보 추출
    const businessCardInfo = parseBusinessCardAnalysis(analysisResult);
    
    return businessCardInfo;
  } catch (error) {
    console.error('명함 OCR 실패:', error);
    throw new Error(`명함 정보 추출 실패: ${error.message}`);
  }
}

/**
 * OpenAI 분석 결과에서 명함 정보 파싱
 */
function parseBusinessCardAnalysis(analysisText: string): {
  companyName?: string;
  jobTitle?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  website?: string;
} {
  const result: any = {};
  
  // 이메일 추출
  const emailMatch = analysisText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  if (emailMatch) {
    result.email = emailMatch[0];
  }
  
  // 전화번호 추출 (한국 형식)
  const phoneMatch = analysisText.match(/(\+82|0)?\s?(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/g);
  if (phoneMatch) {
    result.phoneNumber = phoneMatch[0].replace(/[-\s]/g, '');
  }
  
  // 웹사이트 추출
  const websiteMatch = analysisText.match(/(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g);
  if (websiteMatch) {
    result.website = websiteMatch[0];
  }
  
  // 회사명과 직책은 분석 텍스트에서 추출하기 어려우므로 전체 텍스트를 반환
  // 실제로는 더 정교한 NLP 처리가 필요
  const lines = analysisText.split('\n').filter(line => line.trim());
  if (lines.length >= 2) {
    result.companyName = lines[0];
    result.jobTitle = lines[1];
  }
  
  return result;
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