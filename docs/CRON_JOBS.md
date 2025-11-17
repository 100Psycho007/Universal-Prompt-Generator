# Cron Jobs & Automated Maintenance

This document describes the automated maintenance tasks configured for the Universal IDE Database.

## Overview

The application uses Vercel Cron Jobs to run scheduled maintenance tasks:

1. **Weekly Documentation Re-Crawl** - Updates IDE documentation
2. **Weekly Vector Database Cleanup** - Removes duplicates and orphans
3. **Daily Log Archival** - Archives old admin logs
4. **Monthly Manifest Validation** - Validates and regenerates IDE manifests

## Schedule

| Job | Schedule | Cron Expression | Description |
|-----|----------|----------------|-------------|
| Weekly Re-Crawl | Monday 2 AM UTC | `0 2 * * 1` | Re-crawls all active IDEs |
| Vector Cleanup | Sunday 3 AM UTC | `0 3 * * 0` | Cleans duplicate/orphaned chunks |
| Log Archival | Daily 1 AM UTC | `0 1 * * *` | Archives logs older than 30 days |
| Manifest Validation | 1st of month, 4 AM UTC | `0 4 1 * *` | Validates all IDE manifests |

## Setup

### 1. Database Migration

Run the cron jobs migration to create necessary tables:

```bash
# Apply migration
psql $DATABASE_URL -f migrations/006_cron_jobs_support.sql

# Or using Supabase CLI
supabase db push
```

This creates:
- `archived_admin_logs` table
- `ingest_status` table (if not exists)
- `api_usage_stats` table (if not exists)
- Helper functions for cleanup and maintenance

### 2. Environment Variables

Add the following to your `.env` file:

```bash
# Required: Secret token for cron authentication
CRON_SECRET=your-secure-random-token

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional: Email notifications
ADMIN_EMAIL=admin@yourdomain.com
```

Generate a secure token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Vercel Configuration

The cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-recrawl",
      "schedule": "0 2 * * 1"
    },
    {
      "path": "/api/cron/cleanup-vectors",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/cron/archive-logs",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/validate-manifests",
      "schedule": "0 4 1 * *"
    }
  ]
}
```

### 4. Deployment

Deploy to Vercel to activate cron jobs:

```bash
vercel --prod
```

After deployment, verify cron jobs are registered:
1. Go to your Vercel Dashboard
2. Select your project
3. Navigate to "Settings" → "Cron Jobs"
4. Verify all 4 jobs are listed

## Job Details

### 1. Weekly Documentation Re-Crawl

**Endpoint:** `/api/cron/weekly-recrawl`  
**Schedule:** Monday 2 AM UTC  

**What it does:**
- Fetches all active IDEs
- Re-crawls documentation for each IDE
- Detects changes (new/updated chunks)
- Updates embeddings for changed content
- Logs results and failures

**Response:**
```json
{
  "success": true,
  "jobName": "weekly-recrawl",
  "result": {
    "totalIDEs": 5,
    "successful": 4,
    "failed": 1,
    "skipped": 0,
    "totalChunksAdded": 150,
    "totalChunksUpdated": 23,
    "results": [...]
  },
  "duration": 45000
}
```

**Manual Trigger:**
```bash
curl -X POST https://your-domain.com/api/cron/weekly-recrawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. Vector Database Cleanup

**Endpoint:** `/api/cron/cleanup-vectors`  
**Schedule:** Sunday 3 AM UTC  

**What it does:**
- Removes duplicate doc_chunks (same content, same IDE)
- Removes orphaned embeddings (IDE no longer exists)
- Runs PostgreSQL VACUUM/ANALYZE for performance
- Logs cleanup statistics

**Response:**
```json
{
  "success": true,
  "jobName": "cleanup-vectors",
  "result": {
    "duplicatesRemoved": 12,
    "orphansRemoved": 5,
    "duration": 8500,
    "timestamp": "2024-01-15T03:00:00.000Z"
  },
  "duration": 8500
}
```

**Manual Trigger:**
```bash
curl -X POST https://your-domain.com/api/cron/cleanup-vectors \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Daily Log Archival

**Endpoint:** `/api/cron/archive-logs`  
**Schedule:** Daily 1 AM UTC  

**What it does:**
- Moves logs older than 30 days to `archived_admin_logs`
- Keeps last 30 days in active `admin_logs` table
- Compresses archived logs (PostgreSQL optimization)
- Maintains searchable archive

**Response:**
```json
{
  "success": true,
  "jobName": "archive-logs",
  "result": {
    "logsArchived": 1250,
    "cutoffDate": "2023-12-15T00:00:00.000Z",
    "duration": 3200,
    "timestamp": "2024-01-15T01:00:00.000Z"
  },
  "duration": 3200
}
```

**Manual Trigger:**
```bash
curl -X POST https://your-domain.com/api/cron/archive-logs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Monthly Manifest Validation

**Endpoint:** `/api/cron/validate-manifests`  
**Schedule:** 1st of month, 4 AM UTC  

**What it does:**
- Validates structure of all IDE manifests
- Checks if documentation versions have changed
- Detects stale manifests (>90 days old)
- Auto-regenerates invalid manifests
- Alerts admin on failures

**Response:**
```json
{
  "success": true,
  "jobName": "validate-manifests",
  "result": {
    "totalIDEs": 5,
    "valid": 3,
    "invalid": 1,
    "regenerated": 1,
    "failed": 0,
    "results": [...]
  },
  "duration": 15000
}
```

**Manual Trigger:**
```bash
curl -X POST https://your-domain.com/api/cron/validate-manifests \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Authentication

All cron endpoints require authentication using the `CRON_SECRET`:

```bash
Authorization: Bearer YOUR_CRON_SECRET
```

Vercel automatically includes this header when triggering scheduled jobs.

For manual testing, include the header in your request:

```bash
curl -X POST https://your-domain.com/api/cron/weekly-recrawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Monitoring & Notifications

### Logging

All cron jobs log to:
1. **Console** - Standard output (Vercel logs)
2. **admin_logs** table - Errors and warnings
3. **Structured logs** - JSON format via Logger utility

### Notifications

Jobs send notifications on failure:

1. **Admin Logs** - Always logged to database
2. **Slack** - If `SLACK_WEBHOOK_URL` is set
3. **Email** - If `ADMIN_EMAIL` is set (requires email service)

To enable Slack notifications:

```bash
# Set webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Uncomment the Slack notification code in `/lib/cron-utils.ts`:

```typescript
if (process.env.SLACK_WEBHOOK_URL) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Cron Job Failed: ${jobName}`,
      blocks: [...]
    })
  })
}
```

### Monitoring Dashboard

View cron job results in the Admin Dashboard:

1. Navigate to `/admin/monitor`
2. Select "Logs" tab
3. Filter by action: `CRON_JOB_STARTED_*` or `CRON_JOB_COMPLETED_*`

## Troubleshooting

### Jobs Not Running

1. **Check Vercel Dashboard:**
   - Verify cron jobs are registered
   - Check execution logs

2. **Verify Environment Variable:**
   ```bash
   # In Vercel dashboard, go to Settings → Environment Variables
   # Ensure CRON_SECRET is set
   ```

3. **Check Vercel Plan:**
   - Cron jobs require Hobby or Pro plan
   - Free tier does not support cron jobs

### Authentication Failures

If you see "Unauthorized" errors:

1. **Verify CRON_SECRET matches:**
   - Local `.env` file
   - Vercel environment variables
   - Request header

2. **Check header format:**
   ```bash
   Authorization: Bearer YOUR_SECRET
   # Not: Authorization: YOUR_SECRET
   ```

### Job Timeouts

Vercel has execution time limits:
- Hobby: 10 seconds
- Pro: 60 seconds
- Enterprise: Custom

For long-running jobs:
1. Optimize batch processing
2. Reduce `maxPages` in crawler config
3. Consider upgrading Vercel plan

### Database Errors

If jobs fail with database errors:

1. **Check Supabase connection:**
   ```bash
   # Verify SUPABASE_SERVICE_ROLE_KEY is set
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Verify tables exist:**
   ```sql
   SELECT * FROM archived_admin_logs LIMIT 1;
   SELECT * FROM ingest_status LIMIT 1;
   ```

3. **Check RLS policies:**
   - Service role should bypass RLS
   - Verify policies don't block operations

## Testing Locally

To test cron jobs locally:

### 1. Set Environment Variables

```bash
# .env.local
CRON_SECRET=local-test-secret
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Trigger Jobs Manually

```bash
# Weekly re-crawl
curl -X POST http://localhost:3000/api/cron/weekly-recrawl \
  -H "Authorization: Bearer local-test-secret"

# Vector cleanup
curl -X POST http://localhost:3000/api/cron/cleanup-vectors \
  -H "Authorization: Bearer local-test-secret"

# Log archival
curl -X POST http://localhost:3000/api/cron/archive-logs \
  -H "Authorization: Bearer local-test-secret"

# Manifest validation
curl -X POST http://localhost:3000/api/cron/validate-manifests \
  -H "Authorization: Bearer local-test-secret"
```

### 4. Check Logs

View structured logs in console or database:

```sql
-- Recent cron logs
SELECT * FROM admin_logs 
WHERE action LIKE 'CRON_%' 
ORDER BY timestamp DESC 
LIMIT 20;
```

## Best Practices

1. **Monitor Execution:**
   - Check cron logs weekly
   - Set up Slack/email alerts
   - Review failure rates

2. **Optimize Performance:**
   - Adjust batch sizes for large datasets
   - Use concurrency limits in batchProcess
   - Monitor database performance

3. **Handle Failures Gracefully:**
   - Jobs continue on partial failures
   - Individual IDE failures don't stop batch
   - Detailed error logging

4. **Security:**
   - Rotate CRON_SECRET regularly
   - Use strong random tokens
   - Never commit secrets to git

5. **Database Maintenance:**
   - Monitor table sizes
   - Review archived logs periodically
   - Clean up very old archives (>1 year)

## API Reference

All endpoints follow this pattern:

**Request:**
```http
POST /api/cron/{job-name}
Authorization: Bearer {CRON_SECRET}
Content-Type: application/json
```

**Success Response:**
```json
{
  "success": true,
  "jobName": "string",
  "result": { /* job-specific data */ },
  "duration": 1234
}
```

**Error Response:**
```json
{
  "success": false,
  "jobName": "string",
  "error": "Error message",
  "duration": 1234
}
```

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Expression Reference](https://crontab.guru/)
- [PostgreSQL VACUUM Documentation](https://www.postgresql.org/docs/current/sql-vacuum.html)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:
1. Check Vercel logs
2. Review admin_logs table
3. Test jobs manually
4. Contact support with error logs
