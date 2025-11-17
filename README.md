# Universal IDE Database Schema

This project contains the complete database schema and utilities for the Universal IDE platform, built with Supabase and PostgreSQL with pgvector support.

## Features

- **Complete Database Schema**: Tables for IDEs, documentation chunks, users, prompts, chat history, and admin logs
- **Vector Search**: pgvector integration for semantic search on documentation
- **RAG Chat System**: Conversational AI assistant with retrieval-augmented generation
- **Multi-turn Conversations**: Chat history persistence and context-aware responses
- **Row Level Security**: RLS policies for secure user data access
- **TypeScript Types**: Full type definitions for all database tables
- **Supabase Client**: Pre-configured client with helper functions
- **Seed Data**: Initial IDE data populated automatically

## Database Schema

### Tables

1. **ides** - IDE information and metadata
2. **doc_chunks** - Documentation chunks with vector embeddings
3. **users** - User profiles and preferences
4. **user_prompts** - User-generated prompts and AI responses
5. **chat_history** - Chat conversation history
6. **admin_logs** - Administrative action logs

### Security

- Row Level Security (RLS) enabled on all user tables
- Users can only access their own data
- Authenticated users can read IDE and documentation data
- Service role required for admin operations

## Setup

### Prerequisites

- Node.js 18+ 
- Supabase CLI
- PostgreSQL with pgvector extension

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd universal-ide-database
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your Supabase project in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Setup

1. Start local Supabase:
```bash
npx supabase start
```

2. Apply migrations:
```bash
npm run db:migrate
```

3. Seed initial data:
```bash
npm run db:seed
```

4. Generate TypeScript types:
```bash
npm run db:generate-types
```

## Usage

### Basic Operations

```typescript
import { supabase, getIDEs, createUserPrompt } from './lib/supabase-client'

// Get all active IDEs
const { data: ides, error } = await getIDEs()

// Create a user prompt
const { data: prompt, error } = await createUserPrompt({
  user_id: 'user-uuid',
  ide_id: 'ide-uuid',
  task_description: 'Create a React component',
  raw_input: 'make a button',
  generated_prompt: 'Create a reusable React button component...'
})
```

### Vector Search

```typescript
import { vectorSearch } from './lib/supabase-client'

// Search documentation using embeddings
const { data: results, error } = await vectorSearch({
  embedding: [0.1, 0.2, 0.3, ...], // Your embedding vector
  ideId: 'cursor-uuid',
  limit: 10,
  threshold: 0.7
})
```

### Real-time Subscriptions

```typescript
import { subscribeToChatHistory } from './lib/supabase-client'

// Subscribe to chat updates
const subscription = subscribeToChatHistory(chatId, (payload) => {
  console.log('Chat updated:', payload.new)
})
```

## File Structure

```
├── migrations/
│   ├── 001_initial_schema.sql    # Core schema and indexes
│   ├── 002_rls_policies.sql      # Row Level Security policies
│   └── 003_seed_data.sql         # Initial IDE data
├── types/
│   └── database.ts               # TypeScript type definitions
├── lib/
│   └── supabase-client.ts        # Supabase client and utilities
├── supabase/
│   └── config.toml               # Supabase configuration
├── .env.example                  # Environment variables template
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run db:migrate` - Apply database migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed initial data
- `npm run db:generate-types` - Generate TypeScript types from schema

### Adding New Migrations

1. Create a new SQL file in `migrations/` with a sequential number:
```
migrations/004_new_feature.sql
```

2. Write your SQL migration code

3. Apply the migration:
```bash
npm run db:migrate
```

### Updating Types

After modifying the database schema, regenerate TypeScript types:
```bash
npm run db:generate-types
```

## Documentation Crawler

The documentation crawler ingests IDE docs into the `doc_chunks` table.

### Features

- Recursive crawling with configurable depth
- Respects robots.txt and rate limits (750ms-2000ms between requests)
- Supports HTML, Markdown, and plain text
- Version detection from URLs and content
- Graceful error handling with detailed stats
- Skips non-documentation pages (blog, pricing, legal)

### Usage

Trigger a crawl via HTTP:

```bash
curl -X POST http://localhost:3000/api/ingestIDE \
  -H "Content-Type: application/json" \
  -d '{
    "ideName": "Cursor",
    "seedUrls": ["https://docs.cursor.com"],
    "maxPages": 50,
    "maxDepth": 3
  }'
```

Or programmatically:

```typescript
import { crawlDocumentation } from '@/lib/crawler'

const stats = await crawlDocumentation(
  'https://docs.cursor.com',
  ['https://docs.cursor.com'],
  ideId,
  undefined,
  { maxPages: 50, maxDepth: 3 }
)

console.log(`Stored ${stats.storedChunks} chunks`)
```

### Testing

Run the crawler test suite:

```bash
npx tsx scripts/test-crawler.ts
```

See `docs/CRAWLER.md` for comprehensive documentation.

### Embedding Pipeline

After documentation chunks are stored, generate embeddings via the server-side endpoint:

```bash
curl -X POST http://localhost:3000/api/embedChunks \
  -H "Content-Type: application/json" \
  -d '{
    "ideId": "cursor-uuid",
    "limit": 250
  }'
```

The embedding pipeline processes chunks in batches of 25, caches previously embedded content, and prioritizes the OpenRouter embeddings API with an automatic fallback to OpenAI's `text-embedding-3-small` model. Failed embeddings are returned in the response so they can be queued for retry.

## Security Considerations

- All user data is protected by Row Level Security
- API keys should never be exposed on the client side
- Use service role key only in server-side code
- Validate all user inputs before database operations
- Consider rate limiting for API endpoints
- Documentation crawler respects robots.txt and throttles requests

## Performance

- Vector indexes configured for efficient similarity search
- Documentation crawler enforces per-host rate limits with exponential backoff
- Database indexes on foreign keys and timestamp columns
- Consider connection pooling for high-traffic applications
- Monitor query performance and optimize as needed

## Deployment

1. Configure production environment variables
2. Apply migrations to production Supabase instance
3. Generate production types
4. Deploy application

## RAG Chat System

The platform includes a conversational AI assistant that answers questions about IDE documentation using Retrieval-Augmented Generation (RAG).

### Key Features

- **Vector Similarity Search**: Retrieves top-k most relevant documentation chunks
- **Context Injection**: Embeds retrieved chunks into LLM prompts for accurate responses
- **Multi-turn Conversations**: Maintains conversation history and context
- **Citation Tracking**: Shows which documentation sources were used
- **Rate Limiting**: 10 messages per user per minute
- **LLM Integration**: OpenRouter (primary) with OpenAI fallback

### API Endpoint

```
POST /api/chat
```

### Usage Example

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
console.log(data.sources) // Documentation citations
```

### Configuration

Set these environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

For detailed API documentation, see [docs/chat-api.md](docs/chat-api.md).

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Update documentation
5. Submit a pull request

## License

[Your License Here]