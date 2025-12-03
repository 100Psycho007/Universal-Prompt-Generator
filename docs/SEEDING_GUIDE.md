# AI Agent Documentation Seeding Guide

This guide explains how to seed the database with documentation for 15 AI coding agents.

## Overview

The seeding process ingests documentation from various AI coding assistants and development tools, making their documentation searchable and available for RAG-based prompt generation and chat assistance.

## AI Agents Included

The seeding script ingests documentation for the following 15 AI agents:

1. **Cursor** - AI-powered code editor
2. **Claude** - Anthropic's AI assistant
3. **Gemini** - Google's multimodal AI
4. **GitHub Copilot** - GitHub's AI pair programmer
5. **Coder** - Cloud development environments
6. **Bolt.new** - AI-powered web development
7. **Lovable** - AI software engineer
8. **Tabnine** - AI code completion
9. **Amazon CodeWhisperer** - AWS AI coding companion
10. **JetBrains AI Assistant** - AI for JetBrains IDEs
11. **Visual Studio IntelliCode** - Microsoft's AI assistant
12. **Replit Ghostwriter** - Replit's AI assistant
13. **Kiro** - AI-powered development environment
14. **cto.new** - AI platform for full-stack apps
15. **Qoder** - AI coding assistant

## Prerequisites

Before running the seeding script:

1. **Environment Variables** - Ensure these are set in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key  # For embeddings
   # OR
   OPENROUTER_API_KEY=your_openrouter_key
   ```

2. **Database Migrations** - Apply all migrations:
   ```bash
   # Apply migration 005 (auth enhancements) if not already applied
   psql $DATABASE_URL -f migrations/005_auth_enhancements.sql
   
   # Or use Supabase CLI
   supabase db push
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

## Running the Seeding Script

### Option 1: CLI Script (Recommended)

Run the standalone seeding script:

```bash
npm run seed:ai-agents
```

This will:
- Process all 15 AI agents sequentially
- Show detailed progress for each agent
- Display a comprehensive summary at the end
- Take approximately 30-60 minutes to complete

**Example Output:**
```
🌱 AI AGENT DOCUMENTATION SEEDING
==================================================

Seeding 15 AI coding agents...
This may take 30-60 minutes depending on documentation size.

============================================================
🚀 Processing: Cursor
📚 Documentation: https://docs.cursor.com/
============================================================

📝 Step 1/4: Creating IDE record...
✅ IDE created with ID: 123e4567-e89b-12d3-a456-426614174000

🕷️  Step 2/4: Crawling documentation...
✅ Crawled 45 pages, created 234 chunks

🧠 Step 3/4: Generating embeddings...
✅ Generated 234 embeddings

📋 Step 4/4: Building manifest...
✅ Manifest updated

✨ Successfully seeded Cursor in 342.5s

...

📊 SEEDING SUMMARY
==================================================

✅ Successful: 15/15
❌ Failed: 0/15
⏱️  Total Duration: 48.32 minutes

📄 Total Chunks Created: 5,432
🧠 Total Embeddings Generated: 5,432

✅ Successful Agents:
   • Cursor (234 chunks, 342.5s)
   • Claude (412 chunks, 523.1s)
   ...
```

### Option 2: API Endpoint

You can also trigger seeding via the API (requires admin authentication):

```bash
# Seed all agents
curl -X POST http://localhost:3000/api/admin/seed-agents \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Seed a specific agent
curl -X POST http://localhost:3000/api/admin/seed-agents?agent=cursor \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**API Response:**
```json
{
  "success": true,
  "message": "Seeded 15/15 agents",
  "results": [
    {
      "agent": "Cursor",
      "success": true,
      "ideId": "123e4567-e89b-12d3-a456-426614174000",
      "chunksCreated": 234,
      "embeddingsGenerated": 234
    },
    ...
  ],
  "durationMs": 2899200
}
```

## What Happens During Seeding

For each AI agent, the script performs these steps:

### 1. Create IDE Record
Creates or updates the IDE entry in the `ides` table with:
- Name, URL, documentation URL
- Description and metadata
- Initial manifest structure

### 2. Crawl Documentation
- Fetches documentation pages from the specified URL
- Respects `robots.txt` and rate limits
- Extracts text content and metadata
- Handles multiple content types (HTML, Markdown, plain text)
- Follows links up to configured depth (2-3 levels)
- Limits to 40-120 pages per agent (configurable)

### 3. Chunk Content
- Splits documentation into semantic chunks
- Uses token-based chunking (300-1000 tokens per chunk)
- Maintains overlap for context continuity
- Preserves section metadata and source URLs
- Stores chunks in `doc_chunks` table

### 4. Generate Embeddings
- Creates vector embeddings for each chunk
- Uses OpenAI `text-embedding-3-small` model
- Batches requests for efficiency (25 chunks at a time)
- Retries failed embeddings with exponential backoff
- Updates chunks with embedding vectors

### 5. Build Manifest
- Detects preferred prompt format from documentation
- Generates prompt templates for all formats
- Creates validation rules
- Stores manifest in IDE record's JSONB field
- Updates `doc_count` and `last_ingested_at` fields

### 6. Track Progress
- Creates `ingest_status` record for each agent
- Logs to `admin_logs` table
- Updates status on completion or failure
- Stores error messages for debugging

## Database Tables Updated

The seeding process populates/updates:

1. **ides** - IDE metadata and manifests
2. **doc_chunks** - Chunked documentation text
3. **ingest_status** - Crawl operation tracking
4. **admin_logs** - Detailed operation logs

## Error Handling

The script is designed to be robust:

- **Network Failures**: Automatic retries with exponential backoff
- **Rate Limiting**: Respects server rate limits, waits between requests
- **Individual Failures**: One agent failure doesn't stop others
- **Partial Success**: Continues with embedding generation even if some chunks fail
- **Idempotent**: Can be re-run safely - updates existing records

## Monitoring Progress

### During Execution

Watch the console output for real-time progress:
- Current agent being processed
- Step-by-step progress (1/4, 2/4, etc.)
- Pages crawled and chunks created
- Embeddings generated
- Errors encountered

### After Completion

Check the database:

```sql
-- View all seeded IDEs
SELECT name, doc_count, last_ingested_at, status 
FROM ides 
ORDER BY name;

-- Check chunk counts
SELECT 
  i.name,
  COUNT(dc.id) as total_chunks,
  COUNT(dc.embedding) as chunks_with_embeddings
FROM ides i
LEFT JOIN doc_chunks dc ON i.id = dc.ide_id
GROUP BY i.id, i.name
ORDER BY i.name;

-- View ingest status
SELECT 
  i.name,
  s.status,
  s.chunks_processed,
  s.completed_at,
  s.error_message
FROM ingest_status s
JOIN ides i ON s.ide_id = i.id
ORDER BY s.created_at DESC;

-- Check admin logs
SELECT * FROM admin_logs 
WHERE action LIKE '%SEED%' 
ORDER BY timestamp DESC 
LIMIT 20;
```

### Expected Results

After successful seeding, you should have:

- **15 IDE records** in the `ides` table
- **5,000-15,000 doc chunks** (varies by documentation size)
- **All chunks have embeddings** (embedding field not null)
- **All manifests generated** (manifest field populated)
- **Ingest status completed** for all agents

## Troubleshooting

### Common Issues

**1. Embedding Generation Fails**
```
Error: OpenAI API key not configured
```
**Solution:** Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in environment

**2. Database Connection Error**
```
Error: Supabase admin client is not initialized
```
**Solution:** Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly

**3. Rate Limiting**
```
Error: HTTP 429: Too Many Requests
```
**Solution:** Script automatically retries. Increase `rateLimit` in crawl options if needed.

**4. Insufficient Permissions**
```
Error: permission denied for table doc_chunks
```
**Solution:** Ensure service role key has proper permissions (check RLS policies)

**5. Memory Issues**
```
JavaScript heap out of memory
```
**Solution:** Increase Node memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run seed:ai-agents
```

### Partial Re-runs

If seeding fails for specific agents, you can re-run just those agents:

```bash
# Via API
curl -X POST http://localhost:3000/api/admin/seed-agents?agent=cursor \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or modify the script to only include specific agents:

```typescript
// In seed-ai-agents.ts, filter AI_AGENTS array
const agentsToSeed = AI_AGENTS.filter(a => 
  ['Cursor', 'Claude'].includes(a.name)
)
```

## Performance Optimization

### Speed Up Seeding

1. **Reduce page limits** in `crawlOptions.maxPages`
2. **Decrease crawl depth** in `crawlOptions.maxDepth`
3. **Use allowedPatterns** to focus on relevant documentation
4. **Increase rate limit** (carefully, respecting server policies)

### Reduce Costs

1. **Use OpenRouter** instead of OpenAI (potentially cheaper)
2. **Set lower maxPages** to reduce embedding costs
3. **Skip redundant pages** with better `allowedPatterns`

## Customization

### Adding New AI Agents

Add to the `AI_AGENTS` array in `scripts/seed-ai-agents.ts`:

```typescript
{
  name: 'NewAgent',
  url: 'https://newagent.com',
  docUrl: 'https://docs.newagent.com/',
  description: 'Description of the agent',
  crawlOptions: {
    maxPages: 50,
    maxDepth: 2,
    allowedPatterns: [/\/docs\//i]
  }
}
```

### Adjusting Crawl Behavior

Modify default options in the `DocumentCrawler` constructor:

```typescript
const crawler = new DocumentCrawler(agent.docUrl, {
  maxPages: 100,           // Max pages to crawl
  maxDepth: 3,             // Link depth to follow
  rateLimit: 1000,         // Milliseconds between requests
  respectRobotsTxt: true,  // Honor robots.txt
  timeout: 30000,          // Request timeout (ms)
  retryAttempts: 3,        // Retry failed requests
  allowedPatterns: []      // URL patterns to include
})
```

## Maintenance

### Re-crawling Existing Agents

To update documentation for existing agents:

1. Delete existing chunks:
   ```sql
   DELETE FROM doc_chunks WHERE ide_id = 'YOUR_IDE_ID';
   ```

2. Re-run seeding for that agent:
   ```bash
   curl -X POST http://localhost:3000/api/admin/seed-agents?agent=cursor \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

Or use the weekly re-crawl cron job (automatically configured in Vercel).

### Monitoring Staleness

Check when documentation was last updated:

```sql
SELECT 
  name,
  last_ingested_at,
  AGE(NOW(), last_ingested_at) as staleness
FROM ides
ORDER BY last_ingested_at ASC;
```

## Next Steps

After seeding:

1. **Verify Data**: Check database has all expected records
2. **Test Chat**: Try the chat interface with different agents
3. **Generate Prompts**: Use the prompt generator to test retrieval
4. **Monitor Usage**: Track API usage and response quality
5. **Set Up Cron**: Configure weekly re-crawl in production

## Related Documentation

- [Crawler Implementation](../lib/crawler.ts)
- [Embeddings Service](../lib/embeddings.ts)
- [Manifest Builder](../lib/manifest-builder.ts)
- [Database Utilities](../lib/db-utils.ts)
- [Cron Jobs Guide](./CRON_JOBS.md)
- [Admin Dashboard](../app/admin/README.md)
