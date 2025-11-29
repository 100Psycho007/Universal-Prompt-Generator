# API Documentation

Complete API reference for the Universal IDE Platform.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

Most endpoints require authentication via Supabase Auth. Include the session token in requests:

```javascript
const { data: { session } } = await supabase.auth.getSession()
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
```

## Rate Limiting

- **Per User**: 100 requests/minute
- **Per IP**: 1000 requests/minute
- **Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Invalid request parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_SERVICE_ERROR`: Third-party service error

---

## Endpoints

### Health Check

#### `GET /api/health`

Check API health and connectivity.

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "embedding": "available"
  }
}
```

**Status Codes**:
- `200`: Service healthy
- `503`: Service unavailable

---

### Prompt Generation

#### `POST /api/prompt/generate`

Generate IDE-specific prompts using RAG.

**Authentication**: Required (guest mode allowed in development)

**Request Body**:
```json
{
  "taskDescription": "Create a React component with state",
  "ideId": "uuid-of-ide"
}
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskDescription | string | Yes | User's task description |
| ideId | string (UUID) | Yes | IDE identifier |

**Response**:
```json
{
  "success": true,
  "prompt": "You are an expert VSCode developer...",
  "sources": [
    {
      "url": "https://docs.vscode.com/api",
      "text": "Documentation excerpt..."
    }
  ],
  "metadata": {
    "ideId": "uuid",
    "responseTimeMs": 1234,
    "docCount": 5
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `401`: Unauthorized
- `503`: Service unavailable

**Example**:
```bash
curl -X POST http://localhost:3000/api/prompt/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "taskDescription": "How do I debug TypeScript in VSCode?",
    "ideId": "vscode-uuid"
  }'
```

---

### Chat

#### `POST /api/chat`

Send a message to the RAG chat assistant.

**Authentication**: Required

**Request Body**:
```json
{
  "message": "How do I configure prettier?",
  "ideId": "uuid-of-ide",
  "conversationId": "optional-conversation-uuid",
  "userId": "user-uuid"
}
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | User's message |
| ideId | string (UUID) | Yes | IDE identifier |
| conversationId | string (UUID) | No | Existing conversation ID |
| userId | string (UUID) | Yes | User identifier |

**Response**:
```json
{
  "response": "To configure Prettier in VSCode...",
  "sources": [
    {
      "url": "https://docs.vscode.com/prettier",
      "text": "Documentation excerpt",
      "section": "Configuration",
      "similarity": 0.89
    }
  ],
  "conversationId": "conversation-uuid",
  "tokensUsed": {
    "prompt": 150,
    "completion": 200,
    "total": 350
  },
  "metadata": {
    "model": "gpt-4-turbo-preview",
    "responseTimeMs": 2345,
    "confidence": "high"
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded
- `500`: Internal server error

**Example**:
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: 'How do I create a new extension?',
    ideId: 'vscode-uuid',
    userId: 'user-uuid'
  })
})

const data = await response.json()
console.log(data.response)
console.log(data.sources)
```

---

#### `GET /api/chat/history`

Retrieve chat conversation history.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string (UUID) | Yes | User identifier |
| ideId | string (UUID) | No | Filter by IDE |

**Response**:
```json
{
  "conversations": [
    {
      "id": "conversation-uuid",
      "ideId": "ide-uuid",
      "messages": [
        {
          "role": "user",
          "content": "How do I debug?",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "role": "assistant",
          "content": "To debug in VSCode...",
          "timestamp": "2024-01-15T10:30:05Z",
          "metadata": {
            "model": "gpt-4-turbo-preview",
            "tokensUsed": { "total": 350 },
            "sources": [...],
            "confidence": "high"
          }
        }
      ],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:05Z"
    }
  ]
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

**Example**:
```bash
curl http://localhost:3000/api/chat/history?userId=user-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Authentication

#### `GET /api/auth/callback`

OAuth callback handler for Google Sign-In.

**Authentication**: Not required (handled by OAuth flow)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | OAuth authorization code |
| error | string | No | OAuth error if any |

**Redirect**:
- Success: `/` (home page)
- Error: `/auth/login?error=auth_failed`

**Usage**: Automatically called by Google OAuth flow. Configure in Google Cloud Console:
```
Redirect URI: https://your-domain.com/api/auth/callback
```

---

### Cron Jobs (Internal)

All cron endpoints require Bearer token authentication with `CRON_SECRET`.

**Note:** Due to Vercel Hobby plan limits (max 2 cron jobs), only `weekly-recrawl` and `cleanup-vectors` are automatically scheduled. The other jobs (`archive-logs`, `validate-manifests`) must be triggered manually.

#### `POST /api/cron/weekly-recrawl`

Re-crawl all active IDE documentation. **[AUTOMATED - Monday 2 AM UTC]**

**Authentication**: Bearer token (CRON_SECRET)

**Headers**:
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response**:
```json
{
  "success": true,
  "message": "Re-crawl completed",
  "stats": {
    "idesProcessed": 25,
    "totalChunks": 5000,
    "newChunks": 120,
    "updatedChunks": 45,
    "errors": 0,
    "duration": 180000
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized (invalid token)
- `500`: Internal server error

**Manual Trigger**:
```bash
curl -X POST https://your-domain.com/api/cron/weekly-recrawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

#### `POST /api/cron/cleanup-vectors`

Clean up duplicate and orphaned vectors. **[AUTOMATED - Sunday 3 AM UTC]**

**Authentication**: Bearer token (CRON_SECRET)

**Response**:
```json
{
  "success": true,
  "message": "Vector cleanup completed",
  "stats": {
    "duplicatesRemoved": 45,
    "orphansRemoved": 12,
    "vacuumExecuted": true,
    "duration": 30000
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

---

#### `POST /api/cron/archive-logs`

Archive admin logs older than 30 days. **[MANUAL TRIGGER ONLY]**

**Authentication**: Bearer token (CRON_SECRET)

**Response**:
```json
{
  "success": true,
  "message": "Log archival completed",
  "stats": {
    "logsArchived": 2500,
    "oldestArchived": "2023-12-15T10:30:00Z",
    "duration": 15000
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

---

#### `POST /api/cron/validate-manifests`

Validate and regenerate IDE manifests if needed. **[MANUAL TRIGGER ONLY]**

**Authentication**: Bearer token (CRON_SECRET)

**Response**:
```json
{
  "success": true,
  "message": "Manifest validation completed",
  "stats": {
    "manifestsChecked": 25,
    "manifestsRegenerated": 3,
    "errors": 0,
    "duration": 45000
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

---

## Response Time Targets

| Endpoint | Target | Actual (Avg) |
|----------|--------|--------------|
| `/api/prompt/generate` | < 2s | ~1.2s |
| `/api/chat` | < 5s | ~2.8s |
| `/api/health` | < 200ms | ~50ms |
| `/api/chat/history` | < 1s | ~400ms |

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip (default: 0)

**Example**:
```bash
curl "http://localhost:3000/api/chat/history?userId=uuid&limit=20&offset=40"
```

## Webhooks

Currently not supported. Planned for future release.

## SDKs

JavaScript/TypeScript SDK coming soon. For now, use direct HTTP requests or the Supabase client.

## Versioning

API version is currently `v1`. Breaking changes will be introduced in new versions with proper migration guides.

**Example future versioning**:
- `/api/v1/chat`
- `/api/v2/chat`

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@your-domain.com
