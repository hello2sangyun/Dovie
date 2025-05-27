import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmailVerification(email: string, verificationCode: string): Promise<void> {
  try {
    const msg = {
      to: email,
      from: 'noreply@dovie.com', // SendGrid에서 인증된 발신자 주소
      subject: 'Dovie 이메일 인증',
      text: `안녕하세요! Dovie 이메일 인증 코드는 ${verificationCode} 입니다. 5분 내에 입력해주세요.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0;">Dovie Messenger</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center;">
            <h2 style="margin: 0 0 20px 0;">이메일 인증 코드</h2>
            <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${verificationCode}</div>
            </div>
            <p style="margin: 20px 0 0 0; opacity: 0.9;">위 코드를 5분 내에 입력해주세요.</p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.<br>
              Dovie Messenger에 오신 것을 환영합니다!
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`이메일 전송 성공: ${email}`);
  } catch (error) {
    console.error('이메일 전송 실패:', error);
    throw new Error('이메일 전송에 실패했습니다.');
  }
}

export function generateEmailVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}