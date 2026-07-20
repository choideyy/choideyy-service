# Choideyy Contact Service

Next.js (App Router) backend for the Choideyy **Contact Us** form.

Primary endpoint:

```http
POST /api/contact
```

Interactive docs:

- Swagger UI: [`GET /api/docs`](http://localhost:3000/api/docs)
- OpenAPI JSON: [`GET /api/openapi.json`](http://localhost:3000/api/openapi.json)

## Features

- Zod validation for every field
- Nodemailer email delivery to a fixed recipient
- Per-IP rate limiting (5 / 15 minutes)
- Honeypot + minimum submission time (bot protection)
- Input sanitization / header & log injection prevention
- Request body size limit (32 KiB)
- Content-Type enforcement
- CORS allowlist
- Security headers
- OpenAPI 3.1 + Swagger UI
- Vitest suite with coverage gates (CI)

## Project structure

```text
app/api/contact/route.ts     # Contact route handler
app/api/docs/route.ts        # Swagger UI
app/api/openapi.json/route.ts
lib/email.ts
lib/rate-limit.ts
lib/validation.ts
lib/logger.ts
lib/openapi.ts               # OpenAPI 3.1 source of truth
openapi/openapi.json         # Generated artifact (CI)
docs/api/                    # Postman, Bruno, HTTP, cURL
.github/workflows/ci.yml
```

## Requirements

- Node.js 20+
- SMTP credentials for outbound mail (runtime only — not needed for tests)

## Project setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` (see [Environment variables](#environment-variables)).

## Environment variables

| Variable                 | Required | Description                             |
| ------------------------ | -------- | --------------------------------------- |
| `SMTP_HOST`              | Yes\*    | SMTP server hostname                    |
| `SMTP_PORT`              | Yes\*    | SMTP port (`587` STARTTLS or `465` SSL) |
| `SMTP_USER`              | Yes\*    | SMTP username                           |
| `SMTP_PASS`              | Yes\*    | SMTP password / app password            |
| `CONTACT_RECEIVER_EMAIL` | Yes\*    | Fixed inbox that receives contact mail  |
| `FRONTEND_ORIGIN`        | Yes      | Allowed CORS origin(s), comma-separated |

\*Required at runtime when sending mail. Automated tests mock SMTP and do **not** need real credentials.

Never commit real secrets. On Vercel, set these under **Project → Settings → Environment Variables**.

## Local development

```bash
npm run dev
```

- API: [http://localhost:3000/api/contact](http://localhost:3000/api/contact)
- Docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Running tests

```bash
npm test                 # Vitest
npm run test:coverage    # Vitest + v8 coverage (fails below 90% lines/statements/functions)
npm run typecheck
npm run lint
npm run format:check
```

All external services (SMTP) are mocked. Tests run in CI without SMTP credentials.

## Generating & validating API docs

```bash
npm run openapi:generate   # writes openapi/openapi.json from lib/openapi.ts
npm run openapi:validate   # fails CI if the spec is invalid
```

After `npm run dev`, open `/api/docs` for Swagger UI (loads `/api/openapi.json`).

## Manual API testing collections

| Tool                | Path                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Postman             | [`docs/api/postman/Choideyy-Contact-API.postman_collection.json`](docs/api/postman/Choideyy-Contact-API.postman_collection.json) |
| Bruno               | [`docs/api/bruno/choideyy-contact/`](docs/api/bruno/choideyy-contact/)                                                           |
| VS Code REST Client | [`docs/api/contact.http`](docs/api/contact.http)                                                                                 |
| cURL examples       | [`docs/api/curl-examples.md`](docs/api/curl-examples.md)                                                                         |

Collections cover success, missing fields, invalid email, empty/oversized message, invalid Content-Type, rate limiting, bot protection, and docs endpoints. Internal server errors are covered by automated mocks (not a live SMTP failure).

## Example requests

### Success

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 555 0100",
    "subject": "General enquiry",
    "message": "Hello, I would like more information about Choideyy.",
    "website": ""
  }'
```

### Frontend `fetch()`

```ts
const formStartedAt = Date.now();

async function submitContact(form: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) {
  const res = await fetch(`${import.meta.env.VITE_CONTACT_API_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...form,
      formStartedAt,
      website: "",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Failed to send message");
  }
  return data;
}
```

## Example responses

**200**

```json
{ "success": true }
```

**400 Validation failed**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "path": "email", "message": "Invalid email format" }]
}
```

**415 Unsupported Media Type**

```json
{ "success": false, "error": "Unsupported Media Type" }
```

**429 Too many requests**

```json
{ "success": false, "error": "Too many requests" }
```

**500 Internal server error**

```json
{ "success": false, "error": "Internal server error" }
```

### Validation rules

| Field                 | Rules                                              |
| --------------------- | -------------------------------------------------- |
| `name`                | Required, 2–100 characters                         |
| `email`               | Required, valid email                              |
| `phone`               | Optional; max 30 chars; digits and `+ - ( ) .`     |
| `subject`             | Optional, max 200 characters; default: `Contact form submission` |
| `message`             | Required, 10–5000 characters                       |
| `formStartedAt`       | Optional; when present, min 3s elapsed, max 1h age |
| `website` / `company` | Honeypots — must be empty / omitted                |

### Status codes

| Status | Meaning                                 |
| ------ | --------------------------------------- |
| `200`  | Accepted                                |
| `400`  | Validation / JSON / bot protection      |
| `403`  | Origin not allowed                      |
| `413`  | Payload too large (> 32 KiB)            |
| `415`  | Content-Type is not `application/json`  |
| `429`  | Rate limit exceeded                     |
| `500`  | Unexpected error (generic message only) |

## Scripts

| Script                     | Description                     |
| -------------------------- | ------------------------------- |
| `npm run dev`              | Next.js dev server              |
| `npm run build`            | Production build                |
| `npm start`                | Production server               |
| `npm run lint`             | ESLint                          |
| `npm run format`           | Prettier write                  |
| `npm run format:check`     | Prettier check                  |
| `npm test`                 | Vitest                          |
| `npm run test:coverage`    | Vitest with coverage thresholds |
| `npm run typecheck`        | TypeScript `--noEmit`           |
| `npm run openapi:generate` | Write `openapi/openapi.json`    |
| `npm run openapi:validate` | Validate OpenAPI spec           |

## Deployment (Vercel)

1. Import this repository into Vercel.
2. Add all environment variables from `.env.example`.
3. Deploy.
4. Point the frontend Contact Us form at `https://<your-deployment>/api/contact`.
5. Ensure `FRONTEND_ORIGIN` matches the live frontend origin exactly (scheme + host + port).
6. Open `https://<your-deployment>/api/docs` to verify the published OpenAPI UI.

### Rate limiting note

The default limiter is in-memory (5 requests / 15 minutes / IP). For multi-region scale, replace the store in `lib/rate-limit.ts` with a shared backend (e.g. Upstash Redis).

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

1. `npm ci`
2. lint
3. typecheck
4. format check
5. tests with coverage
6. OpenAPI generate + validate
7. production build

The pipeline **fails** if lint, typecheck, tests, coverage thresholds, OpenAPI validation, or build fails.

## Troubleshooting

| Symptom                      | Likely cause               | Fix                                                                                                                                                                          |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `403 Origin not allowed`     | `FRONTEND_ORIGIN` mismatch | Use exact origin including scheme/port                                                                                                                                       |
| `415 Unsupported Media Type` | Wrong Content-Type         | Send `application/json`                                                                                                                                                      |
| `429 Too many requests`      | IP exceeded 5/15m          | Wait for `Retry-After` or reset limiter in dev                                                                                                                               |
| `500 Internal server error`  | SMTP misconfiguration      | Check server logs. For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) as `SMTP_PASS` (not your normal Google password), then restart `npm run dev`. |
| Emails not arriving          | Provider auth / spam       | Verify SMTP credentials; check spam folder                                                                                                                                   |
| Swagger UI blank             | CDN blocked                | Ensure network access to `unpkg.com` for `/api/docs`                                                                                                                         |
| `npm` peer dependency errors | Wrong `next` major         | Use Next.js 15 + React 19 as in `package.json`                                                                                                                               |
| Coverage below 90%           | Incomplete tests           | Run `npm run test:coverage` and inspect `coverage/`                                                                                                                          |

## Security notes

- SMTP credentials are read only from environment variables.
- Stack traces and internal errors are never returned to clients.
- User content is escaped for HTML email and sanitized before logging / headers.
- Recipient is always `CONTACT_RECEIVER_EMAIL`.
- Logging records `requestId`, timestamp, IP, and success/failure — never passwords or SMTP secrets.

## License

Private — Choideyy.
