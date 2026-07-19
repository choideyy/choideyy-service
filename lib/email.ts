import nodemailer from "nodemailer";

import type { ContactFormData } from "@/lib/validation";
import { escapeHtml, sanitizeForHeader, sanitizeForLog } from "@/lib/sanitize";

export type ContactEmailMeta = {
  timestamp: string;
  clientIp: string;
  userAgent: string;
  requestId: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  receiver: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSmtpConfig(): SmtpConfig {
  const portRaw = requireEnv("SMTP_PORT");
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port");
  }

  return {
    host: requireEnv("SMTP_HOST"),
    port,
    user: requireEnv("SMTP_USER"),
    pass: requireEnv("SMTP_PASS"),
    receiver: requireEnv("CONTACT_RECEIVER_EMAIL"),
  };
}

function buildTextBody(data: ContactFormData, meta: ContactEmailMeta): string {
  return [
    "New Contact Us submission",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Subject: ${data.subject}`,
    `Timestamp: ${meta.timestamp}`,
    `Client IP: ${meta.clientIp}`,
    `User Agent: ${meta.userAgent}`,
    `Request ID: ${meta.requestId}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}

function buildHtmlBody(data: ContactFormData, meta: ContactEmailMeta): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <h2>New Contact Us submission</h2>
  <table style="border-collapse: collapse;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Name</strong></td><td>${escapeHtml(data.name)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Email</strong></td><td>${escapeHtml(data.email)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Subject</strong></td><td>${escapeHtml(data.subject)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Timestamp</strong></td><td>${escapeHtml(meta.timestamp)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Client IP</strong></td><td>${escapeHtml(meta.clientIp)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>User Agent</strong></td><td>${escapeHtml(meta.userAgent)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Request ID</strong></td><td>${escapeHtml(meta.requestId)}</td></tr>
  </table>
  <h3>Message</h3>
  <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(data.message)}</pre>
</body>
</html>`.trim();
}

/**
 * Send contact form email. Recipient is always CONTACT_RECEIVER_EMAIL —
 * never accept arbitrary recipients from the client.
 */
export async function sendContactEmail(
  data: ContactFormData,
  meta: ContactEmailMeta,
): Promise<void> {
  const config = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  // Header-safe values only — prevents email header injection.
  const safeSubject = sanitizeForHeader(data.subject, 200);
  const safeName = sanitizeForHeader(data.name, 100);
  const safeEmail = sanitizeForHeader(data.email, 254);
  const replyTo = `${safeName} <${safeEmail}>`;

  await transporter.sendMail({
    from: `"Choideyy Contact" <${config.user}>`,
    to: config.receiver, // Fixed recipient — never client-controlled
    replyTo,
    subject: `[Contact] ${safeSubject}`,
    text: buildTextBody(data, meta),
    html: buildHtmlBody(data, meta),
    headers: {
      "X-Request-Id": sanitizeForLog(meta.requestId, 64),
    },
  });
}
