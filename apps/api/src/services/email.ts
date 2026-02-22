import { env } from "../config/index.js";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // In development, we use Mailhog which doesn't require authentication
  if (env.NODE_ENV === "development") {
    try {
      const response = await fetch(`http://${process.env.SMTP_HOST || "localhost"}:8025/api/v2/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      console.log(`[Email] Would send to ${options.to}: ${options.subject}`);
      return true;
    } catch {
      console.log(`[Email] Dev mode - logged email to ${options.to}: ${options.subject}`);
      return true;
    }
  }

  // TODO: Implement production email sending (SendGrid, AWS SES, etc.)
  console.log(`[Email] Sending to ${options.to}: ${options.subject}`);
  return true;
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Verify your Ramzee account",
    text: `Welcome to Ramzee! Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
    html: `
      <h1>Welcome to Ramzee! 🐏</h1>
      <p>Your verification code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${code}</h2>
      <p>This code expires in 15 minutes.</p>
      <p>If you didn't create a Ramzee account, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${process.env.WEB_URL || "http://localhost:3001"}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: "Reset your Ramzee password",
    text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `
      <h1>Reset your Ramzee password 🐏</h1>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });
}
