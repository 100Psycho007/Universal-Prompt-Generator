# Chat API Documentation

## Overview

The RAG Conversational Assistant provides a chat endpoint that answers questions about IDE documentation using Retrieval-Augmented Generation (RAG). The system retrieves relevant documentation chunks and uses them to generate accurate, context-aware responses.

## Endpoint

```
POST /api/chat
```

## Authentication

Requires a valid Supabase authentication token. Include the token in the `Authorization` header:

```
Authorization: Bearer <your_supabase_jwt_token>
```

## Request Body

```typescript
interface ChatRequest {
  ide_id: string              // Required: ID of the IDE to query
  messages: ChatMessage[]     // Required: Array of chat messages
  chat_id?: string           // Optional: Continue existing conversation
  options?: {
    top_k?: number          // Optional: Number of docs to retrieve (default: 5)
    threshold?: number      // Optional: Similarity threshold (default: 0.7)
    max_tokens?: number     // Optional: Max response tokens (default: 2000)
    temperature?: number    // Optional: Response randomness (default: 0.7)
  }
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  metadata?: any
}
```

## Response

```typescript
interface ChatAPIResponse {
  response: string           // The generated response
  sources: Array<{          // Source citations
    url: string | null
    text: string
    section: string | null
    similarity: number
  }>
  tokens_used: {
    prompt: number
    completion: number
    total: number
  }
  metadata: {
    model: string            // LLM model used
    response_time: number    // Response time in ms
    confidence: 'high' | 'medium' | 'low'
    chat_id?: string         // Chat session ID
  }
}
```

## Rate Limiting

- **Limit**: 10 messages per user per minute
- **Enforcement**: Per authenticated user
- **Response**: HTTP 429 when exceeded

## Usage Examples

### Basic Chat

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    ide_id: 'vscode',
    messages: [
      { role: 'user', content: 'How do I create a new extension?' }
    ]
  })
})

const data = await response.json()
console.log(data.response)
```

### Continuing a Conversation

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    ide_id: 'vscode',
    chat_id: 'existing-chat-id',
    messages: [
      { role: 'user', content: 'Can you show me an example?' }
    ],
    options: {
      top_k: 8,
      threshold: 0.6,
      temperature: 0.5
    }
  })
})
```

### Multi-turn Conversation

```javascript
const messages = [
  { role: 'user', content: 'What is VS Code?' },
  { role: 'assistant', content: 'VS Code is a lightweight code editor...' },
  { role: 'user', content: 'How do I install extensions?' }
]

const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    ide_id: 'vscode',
    messages
  })
})
```

## Error Handling

### Common Error Responses

```json
{ "error": "Method not allowed" }              // HTTP 405
{ "error": "Authentication required" }         // HTTP 401
{ "error": "Rate limit exceeded" }             // HTTP 429
{ "error": "IDE not found or inactive" }      // HTTP 404
{ "error": "Invalid request: ide_id and messages are required" }  // HTTP 400
{ "error": "Chat session not found" }          // HTTP 404
```

## Features

### RAG Retrieval
- Vector similarity search using pgvector
- Configurable top-k retrieval (default: 5 chunks)
- Similarity threshold filtering (default: 0.7)
- Context assembly with source citations

### LLM Integration
- Primary: OpenRouter (open models like Llama, Mistral)
- Fallback: OpenAI GPT-4
- Configurable model selection
- Token usage tracking

### Conversation Management
- Multi-turn conversation support
- Message history persistence
- Chat session continuation
- User-specific chat histories

### Confidence Scoring
- High: >80% average similarity + source references
- Medium: >60% similarity + multiple sources
- Low: Low similarity or no sources

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
OPENROUTER_APP_NAME=IDE Assistant
OPENROUTER_APP_URL=https://your-app.com
```

### Default Settings

- **Top-k chunks**: 5
- **Similarity threshold**: 0.7
- **Max tokens**: 2000
- **Temperature**: 0.7
- **Rate limit**: 10 messages/minute/user

## Implementation Details

### Vector Search Flow

1. User message is embedded using text-embedding-3-small
2. Vector similarity search finds top-k relevant chunks
3. Chunks are assembled into context with citations
4. Context is injected into system prompt
5. LLM generates response using retrieved context

### Fallback Behavior

- If vector search fails: Falls back to text search
- If OpenRouter fails: Falls back to OpenAI
- If no docs found: Still answers but notes low confidence
- If embedding fails: Uses text-based search

### Performance

- Target response time: <5 seconds
- Retrieval typically: 100-500ms
- LLM generation: 1-3 seconds
- Database queries: <100ms with proper indexing