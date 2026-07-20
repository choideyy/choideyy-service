# cURL examples — Choideyy Contact API

Base URL defaults to `http://localhost:3000`.

## Successful request

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
    "formStartedAt": 1721400000000,
    "website": ""
  }'
```

Expected: `200` `{ "success": true }`

## Missing required field

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "email": "john@example.com",
    "subject": "General enquiry",
    "message": "Hello, I would like more information about Choideyy."
  }'
```

Expected: `400` validation error for `name`

## Invalid email

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "John Doe",
    "email": "not-an-email",
    "subject": "General enquiry",
    "message": "Hello, I would like more information about Choideyy."
  }'
```

Expected: `400` with `details` mentioning `email`

## Empty message

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "General enquiry",
    "message": ""
  }'
```

Expected: `400` validation error for `message`

## Message exceeding maximum length

```bash
MSG=$(python -c "print('M'*5001)")
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d "{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"subject\":\"General enquiry\",\"message\":\"$MSG\"}"
```

Expected: `400` validation error for `message`

## Invalid Content-Type

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: text/plain" \
  -H "Origin: http://localhost:5173" \
  -d 'not-json'
```

Expected: `415` `{ "success": false, "error": "Unsupported Media Type" }`

## Bot protection triggered (honeypot)

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "General enquiry",
    "message": "Hello, I would like more information about Choideyy.",
    "website": "http://spam-bot.example"
  }'
```

Expected: `400` `{ "success": false, "error": "Validation failed", "details": [{"path":"form","message":"Invalid submission"}] }`

## Rate limit exceeded

```bash
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/contact \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:5173" \
    -d '{
      "name": "John Doe",
      "email": "john@example.com",
      "subject": "Rate limit probe",
      "message": "Hello, this request is used to probe rate limiting behavior."
    }'
done
```

Expected: first 5 responses non-429 (200 or 400 depending on SMTP), 6th is `429`

## Internal server error (mocked)

Cannot be forced through a normal cURL against a healthy SMTP configuration. Automated Vitest route tests mock `sendContactEmail` to throw and assert:

```json
{ "success": false, "error": "Internal server error" }
```

No stack traces are returned.

## OpenAPI / Swagger

```bash
curl -s http://localhost:3000/api/openapi.json | head
curl -i http://localhost:3000/api/docs
```
