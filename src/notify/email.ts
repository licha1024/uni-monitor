import nodemailer from 'nodemailer';
import { config } from '../util/config.js';

export async function sendEmail(subject: string, html: string, text: string): Promise<void> {
  if (!config.email.enabled) return;

  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  await transporter.sendMail({
    from: config.email.user,
    to: config.email.to,
    subject,
    text,
    html,
  });

  console.log(`[email] sent to ${config.email.to}`);
}
