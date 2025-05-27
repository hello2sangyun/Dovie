import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMSVerification(phoneNumber: string, verificationCode: string): Promise<void> {
  try {
    const message = await client.messages.create({
      body: `Dovie 인증 코드: ${verificationCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`SMS sent successfully: ${message.sid}`);
  } catch (error) {
    console.error('SMS 전송 실패:', error);
    throw new Error('SMS 전송에 실패했습니다.');
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}