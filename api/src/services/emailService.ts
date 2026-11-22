import { env, isProd } from '../config/env';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo send failed (${res.status}): ${detail}`);
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  // Development convenience: lets you log in even if email delivery is slow or misconfigured
  if (!isProd) console.log(`[dev] OTP for ${to}: ${code}`);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
      <h2>Your login code</h2>
      <p>Use this code to sign in to Campus Lost &amp; Found:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
      <p>It expires in ${env.OTP_TTL_MINUTES} minutes. If you did not request it, ignore this email.</p>
    </div>`;

  await sendEmail(to, `${code} is your Campus Lost & Found code`, html);
} 