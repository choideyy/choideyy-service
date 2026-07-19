import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

import { sendContactEmail } from "@/lib/email";

const baseData = {
  name: "John Doe",
  email: "john@example.com",
  subject: "Hello",
  message: "This is a valid contact message.",
};

const baseMeta = {
  timestamp: "2026-07-19T12:00:00.000Z",
  clientIp: "203.0.113.10",
  userAgent: "vitest",
  requestId: "req-123",
};

describe("sendContactEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "secret-pass";
    process.env.CONTACT_RECEIVER_EMAIL = "inbox@choideyy.com";
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.CONTACT_RECEIVER_EMAIL;
  });

  it("sends mail to the fixed receiver only", async () => {
    await sendContactEmail(baseData, baseMeta);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.test",
        port: 587,
        secure: false,
        auth: { user: "user@test.com", pass: "secret-pass" },
      }),
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0]?.[0] as {
      to: string;
      replyTo: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(mail.to).toBe("inbox@choideyy.com");
    expect(mail.replyTo).toContain("john@example.com");
    expect(mail.subject).toContain("Hello");
    expect(mail.text).toContain("John Doe");
    expect(mail.html).toContain("John Doe");
  });

  it("uses secure transport for port 465", async () => {
    process.env.SMTP_PORT = "465";
    await sendContactEmail(baseData, baseMeta);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it("escapes HTML in the email body", async () => {
    await sendContactEmail(
      { ...baseData, name: `<script>alert(1)</script>`, message: "Safe enough message" },
      baseMeta,
    );
    const mail = sendMail.mock.calls[0]?.[0] as { html: string };
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
  });

  it("strips header injection from subject", async () => {
    await sendContactEmail({ ...baseData, subject: "Hi\r\nBcc: evil@example.com" }, baseMeta);
    const mail = sendMail.mock.calls[0]?.[0] as { subject: string };
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it("throws when SMTP env is missing", async () => {
    delete process.env.SMTP_HOST;
    await expect(sendContactEmail(baseData, baseMeta)).rejects.toThrow(
      /Missing required environment variable/,
    );
  });

  it("throws when SMTP_PORT is invalid", async () => {
    process.env.SMTP_PORT = "not-a-port";
    await expect(sendContactEmail(baseData, baseMeta)).rejects.toThrow(/SMTP_PORT/);
  });

  it("never accepts client-controlled recipients", async () => {
    await sendContactEmail(baseData, baseMeta);
    const mail = sendMail.mock.calls[0]?.[0] as { to: string };
    expect(mail.to).toBe(process.env.CONTACT_RECEIVER_EMAIL);
    expect(mail.to).not.toBe(baseData.email);
  });
});
