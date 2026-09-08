import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();

const SENDER = {
  email: process.env.BREVO_SENDER_EMAIL,
  name: process.env.BREVO_SENDER_NAME || "Biashnet"
};

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not set.");
  }
  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is not set.");
  }

  const payload = new SibApiV3Sdk.SendSmtpEmail();
  payload.sender = SENDER;
  payload.to = [{ email: to }];
  payload.subject = subject;
  payload.htmlContent = html;
  if (text) payload.textContent = text;

  return transactionalEmailsApi.sendTransacEmail(payload);
}

export async function sendPasswordResetEmail(to, link) {
  return sendMail({
    to,
    subject: "Reset your Biashnet password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your Biashnet password. Click the button below to choose a new one. This link expires shortly and can only be used once.</p>
        <p><a href="${link}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
      </div>
    `,
    text: `Reset your Biashnet password: ${link}\n\nIf you didn't request this, you can safely ignore this email.`
  });
}

export async function sendOtpEmail(to, code) {
  return sendMail({
    to,
    subject: "Biashnet login code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your verification code</h2>
        <p>Use this code to finish signing in. It expires in 5 minutes.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Your Biashnet login code is ${code}. It expires in 5 minutes.`
  });
}