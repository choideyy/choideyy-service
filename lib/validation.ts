import { z } from "zod";

import { sanitizeEmailSubject, sanitizeText } from "@/lib/sanitize";

/** Minimum milliseconds between form render and submit (bot protection). */
export const MIN_SUBMISSION_MS = 3_000;

/** Maximum age of a formStartedAt timestamp (reject stale / replayed tokens). */
export const MAX_SUBMISSION_AGE_MS = 60 * 60 * 1000; // 1 hour

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(254, "Email must be at most 254 characters");

export const contactFormSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: emailSchema,
    subject: z
      .string({ required_error: "Subject is required" })
      .trim()
      .min(1, "Subject is required")
      .max(200, "Subject must be at most 200 characters"),
    message: z
      .string({ required_error: "Message is required" })
      .trim()
      .min(10, "Message must be at least 10 characters")
      .max(5000, "Message must be at most 5000 characters"),
    /**
     * Honeypot — must be absent or empty. Real users never fill this.
     * Accept common field names bots might fill.
     */
    website: z.string().optional(),
    company: z.string().optional(),
    /**
     * Client-side timestamp (ms) when the form was shown.
     * Optional for backward compatibility; when present, timing checks apply.
     */
    formStartedAt: z.number().int().positive().optional(),
  })
  .strict();

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ValidationFailure = {
  success: false;
  error: "Validation failed";
  details: Array<{ path: string; message: string }>;
};

export type BotCheckFailure = {
  success: false;
  error: "Validation failed";
  details: Array<{ path: string; message: string }>;
};

export type ValidationSuccess = {
  success: true;
  data: ContactFormData;
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

function isHoneypotFilled(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate and sanitize contact form payload.
 * Never trust client-side validation — all checks run server-side.
 */
export function validateContactPayload(payload: unknown): ValidationResult {
  const parsed = contactFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "body",
        message: issue.message,
      })),
    };
  }

  const data = parsed.data;

  // Honeypot: silently treat as validation failure (same shape as other 400s).
  if (isHoneypotFilled(data.website) || isHoneypotFilled(data.company)) {
    return {
      success: false,
      error: "Validation failed",
      details: [{ path: "form", message: "Invalid submission" }],
    };
  }

  // Minimum submission time / freshness check (when client sends formStartedAt).
  if (data.formStartedAt !== undefined) {
    const elapsed = Date.now() - data.formStartedAt;

    if (elapsed < MIN_SUBMISSION_MS) {
      return {
        success: false,
        error: "Validation failed",
        details: [{ path: "formStartedAt", message: "Submission too fast" }],
      };
    }

    if (elapsed > MAX_SUBMISSION_AGE_MS) {
      return {
        success: false,
        error: "Validation failed",
        details: [{ path: "formStartedAt", message: "Submission expired" }],
      };
    }
  }

  return {
    success: true,
    data: {
      name: sanitizeText(data.name),
      email: sanitizeText(data.email).toLowerCase(),
      subject: sanitizeEmailSubject(sanitizeText(data.subject)),
      message: sanitizeText(data.message),
    },
  };
}
