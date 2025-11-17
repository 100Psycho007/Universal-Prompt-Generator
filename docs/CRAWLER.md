# Documentation Crawler System

A robust web scraper for IDE documentation with error handling and version tracking.

## Features

- **Recursive Crawling**: Follows links up to configurable depth
- **Multi-Format Support**: Handles HTML, Markdown (.md), and plain text (.txt)
- **Robots.txt Compliance**: Respects robots.txt and crawl delays
- **Rate Limiting**: 750ms-2000ms between requests with exponential backoff
- **Binary Detection**: Skips images, PDFs, videos, and other non-doc files
- **Version Detection**: Extracts version from URLs and content
- **Graceful Failures**: Continues crawling on errors with detailed logging
- **Metadata Extraction**: Captures title, section, source URL, and version
- **Token-Aware Chunking**: Splits documentation into 300-1000 token segments with 100-token overlap
- **Content Filtering**: Automatically skips blog posts, pricing, and non-doc pages

## Architecture

### Components

1. **URL Normalizer** (`lib/url-normalizer.ts`)
   - Deduplicates URLs
   - Validates and sanitizes URLs
   - Filters blocked file extensions
   - Same-origin enforcement

2. **Document Parser** (`lib/parser.ts`)
   - Extracts text from HTML using Cheerio
   - Converts HTML to clean Markdown with Turndown
   - Parses Markdown files
   - Extracts metadata (title, section, author, etc.)
   - Removes navigation, headers, footers

3. **Document Chunker** (`lib/chunker.ts`)
   - Uses tiktoken to tokenize content
   - Produces 300-1000 token chunks with 100-token overlap
   - Preserves section boundaries and metadata for each chunk

4. **Crawler** (`lib/crawler.ts`)
   - Manages crawl queue with BFS traversal
   - Handles rate limiting per host
   - Respects robots.txt crawl delays
   - Implements retry logic with exponential backoff
   - Stores chunked content in the `doc_chunks` table

5. **API Endpoint** (`pages/api/ingestIDE.ts`)
   - POST endpoint to trigger crawls
   - Accepts IDE name or ID
   - Configurable options (maxPages, maxDepth, etc.)

## Usage

### API Endpoint

```bash
# Crawl documentation for an IDE by name
curl -X POST http://localhost:3000/api/ingestIDE \
  -H "Content-Type: application/json" \
  -d '{
    "ideName": "Cursor",
    "seedUrls": ["https://docs.cursor.com"],
    "maxPages": 100,
    "maxDepth": 3,
    "version": "0.41.0"
  }'
```

### Programmatic Usage

```typescript
import { crawlDocumentation } from '@/lib/crawler'

const stats = await crawlDocumentation(
  'https://docs.cursor.com',  // Root URL
  ['https://docs.cursor.com'], // Seed URLs
  ideId,                        // IDE UUID
  '0.41.0',                    // Version (optional)
  {
    maxPages: 100,
    maxDepth: 3,
    rateLimit: 750,
    respectRobotsTxt: true,
    exponentialBackoff: true
  }
)

console.log(`Stored ${stats.storedChunks} chunks`)
```

## Configuration

### Crawler Options

```typescript
interface CrawlOptions {
  maxDepth?: number              // Default: 3
  maxPages?: number              // Default: 150
  rateLimit?: number             // Default: 750ms
  respectRobotsTxt?: boolean     // Default: true
  allowedPatterns?: RegExp[]     // Default: []
  userAgent?: string             // Default: 'UniversalIDE-Crawler/1.0'
  timeout?: number               // Default: 15000ms
  retryAttempts?: number         // Default: 3
  exponentialBackoff?: boolean   // Default: true
  maxContentLengthBytes?: number // Default: 2MB
}
```

### Rate Limiting

- Default: 750ms between requests
- Respects robots.txt `Crawl-delay` directive
- Adds random jitter to prevent thundering herd
- Per-host tracking to handle multiple domains

### URL Filtering

**Blocked Extensions:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`, `.ico`
- Documents: `.pdf`, `.zip`, `.tar`, `.gz`
- Media: `.mp4`, `.mp3`, `.mov`, `.avi`
- Executables: `.exe`, `.dmg`, `.apk`, `.msi`

**Blocked URL Patterns:**
- `/blog/` - Blog posts
- `/pricing` - Pricing pages
- `/changelog` - Changelog pages
- `/news`, `/press` - News/press releases
- `/legal`, `/terms`, `/privacy` - Legal pages

## Version Detection

The crawler attempts to extract version information from:

1. **URL Path**: `/v1.2.3/`, `/version-1.2/`, `/1.2/`
2. **Query Parameters**: `?version=1.2.3`
3. **Content**: "Version: 1.2.3", "Release v1.2.3"
4. **Fallback**: "latest"

## Error Handling

The crawler gracefully handles:

- Network timeouts (15s default)
- HTTP errors (4xx, 5xx)
- Malformed HTML/content
- robots.txt blocking
- Content too large (>2MB)
- Invalid URLs
- Aborted requests

All errors are logged in `CrawlStats.errors` array.

## Statistics

After crawling, the system returns:

```typescript
interface CrawlStats {
  startTime: Date
  endTime?: Date
  totalPages: number       // Total attempted
  successfulPages: number  // Successfully crawled
  failedPages: number      // Failed attempts
  skippedPages: number     // Filtered/blocked
  totalBytes: number       // Total content downloaded
  storedChunks: number     // Stored in database
  errors: Array<{
    url: string
    error: string
  }>
}
```

## Testing

### Test Script

Run the crawler test suite:

```bash
npm install
npx tsx scripts/test-crawler.ts
```

This tests crawling for:
- Cursor
- Windsurf
- Continue.dev
- GitHub Copilot
- Cody

### Manual Testing

```bash
# Start Supabase locally
npx supabase start

# Apply migrations
npm run db:migrate

# Seed IDEs
npm run db:seed

# Run the crawler test
npx tsx scripts/test-crawler.ts
```

## Database Schema

Crawled content is stored in the `doc_chunks` table:

```sql
CREATE TABLE doc_chunks (
  id UUID PRIMARY KEY,
  ide_id UUID REFERENCES ides(id),
  text TEXT NOT NULL,
  embedding vector(1536),      -- For semantic search
  source_url TEXT,
  section TEXT,                 -- Extracted section/breadcrumb
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP
);
```

## Performance Considerations

- **Memory**: Queue and dedup set grow with crawl size
- **Network**: Respects rate limits to avoid blocking
- **Storage**: Large docs can generate many chunks
- **Time**: 100 pages @ 750ms = ~2 minutes minimum

## Best Practices

1. **Start Small**: Test with `maxPages: 10-20` first
2. **Monitor Errors**: Check `stats.errors` for issues
3. **Version Lock**: Specify version to avoid mixing docs
4. **Rate Limit**: Increase delay for sensitive sites
5. **Content Review**: Verify stored chunks are relevant

## Limitations

- No JavaScript execution (use Puppeteer for JS-heavy sites)
- No authentication support
- No sitemap.xml parsing
- No content deduplication across versions
- Single-threaded (no parallel requests)

## Future Enhancements

- [ ] Sitemap.xml support
- [ ] Content change detection (incremental updates)
- [ ] Puppeteer integration for JS-rendered content
- [ ] Parallel crawling with concurrency limits
- [ ] Content deduplication across versions
- [x] Token-aware chunking for large documents
- [ ] Screenshot capture for visual docs
- [ ] Link validation and broken link detection

## Troubleshooting

### No pages crawled

- Check robots.txt at target site
- Verify seed URLs are accessible
- Increase timeout if network is slow
- Check console for error details

### Too many failures

- Reduce `maxPages` or `maxDepth`
- Increase `rateLimit`
- Check `allowedPatterns` if using
- Review error logs in stats

### Content too short

- Minimum 100 characters required
- Check if site uses JavaScript rendering
- Verify main content selectors in parser

### Version not detected

- Manually specify version in API call
- Check URL structure for version patterns
- Review content for version keywords

## Support

For issues or questions:
- Review error logs in `CrawlStats.errors`
- Check database for stored chunks
- Verify IDE exists in `ides` table
- Test individual URLs with parser utilities
