import CryptoJS from 'crypto-js';

// 환경변수에서 암호화 키를 가져오거나 기본값 사용
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vault-messenger-default-key-2024';

/**
 * 텍스트를 AES-256으로 암호화
 */
export function encryptText(text: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('암호화 오류:', error);
    throw new Error('텍스트 암호화에 실패했습니다');
  }
}

/**
 * 암호화된 텍스트를 복호화
 */
export function decryptText(encryptedText: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('복호화 오류:', error);
    throw new Error('텍스트 복호화에 실패했습니다');
  }
}

/**
 * 파일 데이터를 암호화 (Base64 + AES)
 */
export function encryptFileData(buffer: Buffer): string {
  try {
    const base64Data = buffer.toString('base64');
    const encrypted = CryptoJS.AES.encrypt(base64Data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('파일 암호화 오류:', error);
    throw new Error('파일 암호화에 실패했습니다');
  }
}

/**
 * 암호화된 파일 데이터를 복호화
 */
export function decryptFileData(encryptedData: string): Buffer {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const base64Data = decrypted.toString(CryptoJS.enc.Utf8);
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('파일 복호화 오류:', error);
    throw new Error('파일 복호화에 실패했습니다');
  }
}

/**
 * 파일명을 안전하게 해시화
 */
export function hashFileName(originalName: string): string {
  const hash = CryptoJS.SHA256(originalName + Date.now()).toString();
  const extension = originalName.split('.').pop();
  return `${hash}.${extension}`;
}