/**
 * OpenAPI 3.1 specification for the Choideyy Contact Service.
 * Served at GET /api/openapi.json and rendered by Swagger UI at GET /api/docs.
 */

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Choideyy Contact Service API",
    version: "1.0.0",
    description: [
      "Production Contact Us API for Choideyy.",
      "",
      "## Security considerations",
      "",
      "- Requests must use `Content-Type: application/json`.",
      "- Browser requests must originate from an allowlisted `FRONTEND_ORIGIN`.",
      "- Per-IP rate limiting: **5 requests / 15 minutes** (sliding window).",
      "- Body size capped at **32 KiB**.",
      "- Bot protection: optional honeypot fields (`website`, `company`) and optional `formStartedAt` timing check (min 3s, max 1h).",
      "- Email recipient is always `CONTACT_RECEIVER_EMAIL` (never client-controlled).",
      "- User input is sanitized against header injection, log injection, and HTML injection in emails.",
      "- Stack traces and secrets are never returned to clients.",
      "",
      "## Rate limiting",
      "",
      "Successful and rejected authenticated-shape requests consume the IP budget.",
      "Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.",
      "When limited, status `429` is returned with `Retry-After`.",
    ].join("\n"),
    contact: {
      name: "Choideyy",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
    { url: "https://choideyy-service.vercel.app", description: "Production (example)" },
  ],
  tags: [
    { name: "Contact", description: "Contact Us form submission" },
    { name: "Documentation", description: "OpenAPI and interactive docs" },
  ],
  paths: {
    "/api/contact": {
      post: {
        tags: ["Contact"],
        summary: "Submit a Contact Us message",
        description:
          "Validates the payload, applies rate limiting and bot checks, then emails the fixed receiver inbox.",
        operationId: "submitContact",
        parameters: [
          {
            name: "Origin",
            in: "header",
            required: false,
            description:
              "Browser origin. Must match `FRONTEND_ORIGIN` when present. Omitted for non-browser clients (e.g. cURL).",
            schema: { type: "string", examples: ["https://choideyy.com"] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContactRequest" },
              examples: {
                success: {
                  summary: "Valid submission",
                  value: {
                    name: "John Doe",
                    email: "john@example.com",
                    subject: "General enquiry",
                    message: "Hello, I would like more information about Choideyy.",
                    formStartedAt: 1721400000000,
                    website: "",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message accepted and email queued/sent",
            headers: {
              "X-Request-Id": { $ref: "#/components/headers/XRequestId" },
              "X-RateLimit-Limit": { $ref: "#/components/headers/XRateLimitLimit" },
              "X-RateLimit-Remaining": { $ref: "#/components/headers/XRateLimitRemaining" },
              "X-RateLimit-Reset": { $ref: "#/components/headers/XRateLimitReset" },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                examples: {
                  ok: { value: { success: true } },
                },
              },
            },
          },
          "400": {
            description: "Validation failed (fields, JSON, honeypot, or timing)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationErrorResponse" },
                examples: {
                  invalidEmail: {
                    summary: "Invalid email",
                    value: {
                      success: false,
                      error: "Validation failed",
                      details: [{ path: "email", message: "Invalid email format" }],
                    },
                  },
                  missingField: {
                    summary: "Missing required field",
                    value: {
                      success: false,
                      error: "Validation failed",
                      details: [{ path: "name", message: "Required" }],
                    },
                  },
                  botProtection: {
                    summary: "Honeypot filled",
                    value: {
                      success: false,
                      error: "Validation failed",
                      details: [{ path: "form", message: "Invalid submission" }],
                    },
                  },
                },
              },
            },
          },
          "403": {
            description: "Origin not allowlisted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  forbidden: {
                    value: { success: false, error: "Origin not allowed" },
                  },
                },
              },
            },
          },
          "413": {
            description: "Request body larger than 32 KiB",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  tooLarge: {
                    value: { success: false, error: "Payload too large" },
                  },
                },
              },
            },
          },
          "415": {
            description: "Content-Type is not application/json",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  unsupported: {
                    value: { success: false, error: "Unsupported Media Type" },
                  },
                },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded for client IP",
            headers: {
              "Retry-After": {
                description: "Seconds until the client may retry",
                schema: { type: "string", examples: ["120"] },
              },
              "X-RateLimit-Limit": { $ref: "#/components/headers/XRateLimitLimit" },
              "X-RateLimit-Remaining": { $ref: "#/components/headers/XRateLimitRemaining" },
              "X-RateLimit-Reset": { $ref: "#/components/headers/XRateLimitReset" },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  limited: {
                    value: { success: false, error: "Too many requests" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Unexpected server error (no stack traces exposed)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  internal: {
                    value: { success: false, error: "Internal server error" },
                  },
                },
              },
            },
          },
        },
      },
      options: {
        tags: ["Contact"],
        summary: "CORS preflight",
        operationId: "contactOptions",
        responses: {
          "204": {
            description: "Preflight OK",
          },
          "403": {
            description: "Origin not allowlisted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["Documentation"],
        summary: "Raw OpenAPI 3.1 document",
        operationId: "getOpenApiJson",
        responses: {
          "200": {
            description: "OpenAPI document",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
    "/api/docs": {
      get: {
        tags: ["Documentation"],
        summary: "Interactive Swagger UI",
        operationId: "getApiDocs",
        responses: {
          "200": {
            description: "HTML page with Swagger UI",
            content: {
              "text/html": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    headers: {
      XRequestId: {
        description: "Correlation ID for logs",
        schema: { type: "string", format: "uuid" },
      },
      XRateLimitLimit: {
        description: "Max requests allowed in the current window",
        schema: { type: "string", examples: ["5"] },
      },
      XRateLimitRemaining: {
        description: "Remaining requests in the current window",
        schema: { type: "string", examples: ["4"] },
      },
      XRateLimitReset: {
        description: "Unix timestamp (seconds) when the window resets",
        schema: { type: "string", examples: ["1721400900"] },
      },
    },
    schemas: {
      ContactRequest: {
        type: "object",
        additionalProperties: false,
        required: ["name", "email", "subject", "message"],
        properties: {
          name: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            description: "Sender display name",
            examples: ["John Doe"],
          },
          email: {
            type: "string",
            format: "email",
            maxLength: 254,
            description: "Sender email (used as Reply-To)",
            examples: ["john@example.com"],
          },
          subject: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            description: "Message subject",
            examples: ["General enquiry"],
          },
          message: {
            type: "string",
            minLength: 10,
            maxLength: 5000,
            description: "Message body",
            examples: ["Hello, I would like more information about Choideyy."],
          },
          formStartedAt: {
            type: "integer",
            description:
              "Optional. `Date.now()` when the form was shown. When present, rejects submissions faster than 3 seconds or older than 1 hour.",
            examples: [1721400000000],
          },
          website: {
            type: "string",
            description: "Honeypot — must be empty or omitted",
            examples: [""],
          },
          company: {
            type: "string",
            description: "Optional second honeypot — must be empty if present",
            examples: [""],
          },
        },
      },
      SuccessResponse: {
        type: "object",
        required: ["success"],
        additionalProperties: false,
        properties: {
          success: { type: "boolean", const: true },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        additionalProperties: false,
        properties: {
          success: { type: "boolean", const: false },
          error: { type: "string" },
        },
      },
      ValidationErrorDetail: {
        type: "object",
        required: ["path", "message"],
        additionalProperties: false,
        properties: {
          path: { type: "string", examples: ["email"] },
          message: { type: "string", examples: ["Invalid email format"] },
        },
      },
      ValidationErrorResponse: {
        type: "object",
        required: ["success", "error", "details"],
        additionalProperties: false,
        properties: {
          success: { type: "boolean", const: false },
          error: { type: "string", const: "Validation failed" },
          details: {
            type: "array",
            items: { $ref: "#/components/schemas/ValidationErrorDetail" },
          },
        },
      },
    },
  },
} as const;

export type OpenApiDocument = typeof openApiDocument;
