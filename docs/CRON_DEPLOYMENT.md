# Cron Jobs Deployment Guide

This guide walks you through deploying the automated maintenance cron jobs to Vercel.

## Prerequisites

- Vercel account (Hobby plan or higher)
- Supabase project configured
- Application deployed on Vercel

## Quick Deployment Checklist

- [ ] Apply database migration
- [ ] Generate and set CRON_SECRET
- [ ] Configure environment variables in Vercel
- [ ] Deploy to production
- [ ] Verify cron jobs are registered
- [ ] Test one cron job manually
- [ ] Monitor first execution

## Step-by-Step Deployment

### 1. Apply Database Migration

First, apply the cron jobs migration to your Supabase database:

```bash
# Option A: Using psql
psql $DATABASE_URL -f migrations/006_cron_jobs_support.sql

# Option B: Using Supabase CLI
supabase db push
```

This creates:
- `archived_admin_logs` table
- `ingest_status` table
- `api_usage_stats` table
- Helper functions for cleanup and maintenance

**Verify migration:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('archived_admin_logs', 'ingest_status', 'api_usage_stats');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('find_duplicate_chunks', 'vacuum_doc_chunks_table', 'vacuum_archived_logs_table');
```

### 2. Generate CRON_SECRET

Generate a secure random token for cron authentication:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Save this token securely - you'll need it for environment variables.

### 3. Configure Environment Variables

**In your local `.env.local` file:**
```bash
CRON_SECRET=your-generated-token-here
```

**In Vercel Dashboard:**

1. Go to your project in Vercel Dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add the following variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Your generated token
   - **Environment:** Production (and Preview/Development if testing)

**Optional variables for notifications:**
```bash
# For Slack notifications (uncomment code in lib/cron-utils.ts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# For email notifications (requires implementing email service)
ADMIN_EMAIL=admin@yourdomain.com
```

### 4. Deploy to Production

Deploy your application to Vercel:

```bash
# Deploy to production
vercel --prod

# Or push to your main branch if auto-deploy is enabled
git add .
git commit -m "feat: add automated maintenance cron jobs"
git push origin main
```

### 5. Verify Cron Jobs Registration

After deployment, verify cron jobs are registered:

1. **In Vercel Dashboard:**
   - Go to your project
   - Navigate to "Settings" → "Cron Jobs"
   - You should see 2 jobs listed (Vercel Hobby plan limit):
     - `/api/cron/weekly-recrawl` - `0 2 * * 1`
     - `/api/cron/cleanup-vectors` - `0 3 * * 0`
   - **Note:** The other 2 jobs (`archive-logs` and `validate-manifests`) are available in the codebase but must be triggered manually

2. **Check deployment logs:**
   - Look for any errors during build/deployment
   - Verify API routes are built correctly

### 6. Test Cron Jobs Manually

Before waiting for scheduled execution, test each job manually:

```bash
# Set your deployment URL and cron secret
DEPLOY_URL="https://your-app.vercel.app"
CRON_SECRET="your-cron-secret"

# Test automated jobs
curl -X POST "$DEPLOY_URL/api/cron/weekly-recrawl" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

curl -X POST "$DEPLOY_URL/api/cron/cleanup-vectors" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Test manual-only jobs (not automatically scheduled)
curl -X POST "$DEPLOY_URL/api/cron/archive-logs" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

curl -X POST "$DEPLOY_URL/api/cron/validate-manifests" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Note:** Since `archive-logs` and `validate-manifests` are not automatically scheduled, you'll need to trigger them manually when needed (recommended: monthly for archive-logs, after IDE additions for validate-manifests).

Expected response format:
```json
{
  "success": true,
  "jobName": "job-name",
  "result": { /* job-specific data */ },
  "duration": 1234
}
```

### 7. Monitor Execution

**View logs in Vercel:**
1. Go to "Deployments" → Select latest deployment
2. Click "Functions" tab
3. Look for cron job executions

**View logs in Supabase:**
```sql
-- Recent cron job logs
SELECT * FROM admin_logs 
WHERE action LIKE 'CRON_%' 
ORDER BY timestamp DESC 
LIMIT 20;

-- Cron job failures
SELECT * FROM admin_logs 
WHERE action LIKE 'CRON_JOB_FAILED_%' 
ORDER BY timestamp DESC;

-- Cron job successes
SELECT * FROM admin_logs 
WHERE action LIKE 'CRON_JOB_COMPLETED_%' 
ORDER BY timestamp DESC;
```

**Set up monitoring (optional):**
1. Configure Slack webhooks for failure alerts
2. Set up email notifications
3. Create a monitoring dashboard

## Troubleshooting

### Cron Jobs Not Appearing in Dashboard

**Issue:** Cron jobs don't show up in Vercel Settings → Cron Jobs

**Solutions:**
1. Verify `vercel.json` is in project root
2. Ensure you're on Hobby plan or higher (not Free tier)
3. Redeploy the project
4. Check for vercel.json syntax errors

### Authentication Failures

**Issue:** `401 Unauthorized` when jobs run

**Solutions:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check the environment variable name is exactly `CRON_SECRET`
3. Ensure the variable is set for "Production" environment
4. Redeploy after setting environment variables

### Jobs Timeout

**Issue:** Jobs fail with timeout errors

**Vercel execution limits:**
- Hobby: 10 seconds
- Pro: 60 seconds
- Enterprise: Custom

**Solutions:**
1. Upgrade to Pro plan for longer execution time
2. Reduce batch sizes in cron jobs
3. Optimize database queries
4. For re-crawl: Reduce `maxPages` in crawler config

### Database Permission Errors

**Issue:** VACUUM functions fail

**Solution:**
```sql
-- Grant necessary permissions to your Supabase user
GRANT USAGE ON SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO your_user;
```

Note: Some VACUUM operations may require superuser. These will log warnings but won't fail the job.

### High API Costs

**Issue:** LLM costs increase due to manifest validation

**Solution:**
- Manifest validation uses `enableLLMFallback: false` by default
- Format detection uses heuristics only in cron jobs
- Monitor OpenAI usage in dashboard

## Production Best Practices

### 1. Monitoring

Set up alerts for:
- Failed cron job executions
- Long execution times (>30s)
- Database errors
- High API costs

### 2. Scaling Considerations

As your IDE database grows:
- **Weekly re-crawl:** May take longer with more IDEs
  - Consider splitting into multiple smaller jobs
  - Add concurrency limits in `batchProcess`
  
- **Vector cleanup:** Scales with chunk count
  - Run more frequently if you have millions of chunks
  
- **Log archival:** Linear with log volume
  - Consider archiving older than 30 days if logs grow large

### 3. Cost Optimization

- **Disable LLM fallback** in format detection for cron jobs (already done)
- **Adjust crawl frequency** based on documentation update frequency
- **Monitor Supabase database size** - consider archiving very old data
- **Use Vercel's built-in analytics** to track function execution costs

### 4. Security

- **Rotate CRON_SECRET** periodically (quarterly recommended)
- **Use different secrets** for production vs. preview environments
- **Monitor for unauthorized access** attempts in logs
- **Keep Supabase RLS policies** up to date

### 5. Backup Strategy

Before major changes:
```bash
# Backup critical tables
pg_dump -t archived_admin_logs $DATABASE_URL > archived_logs_backup.sql
pg_dump -t admin_logs $DATABASE_URL > admin_logs_backup.sql
pg_dump -t ingest_status $DATABASE_URL > ingest_status_backup.sql
```

## Maintenance Schedule

### Weekly
- [ ] Check cron job execution logs
- [ ] Review failure rates
- [ ] Monitor database size growth

### Monthly
- [ ] Review and clean up archived logs (>1 year old)
- [ ] Check API usage and costs
- [ ] Verify all IDEs are being re-crawled successfully

### Quarterly
- [ ] Rotate CRON_SECRET
- [ ] Review and optimize cron schedules
- [ ] Update dependencies
- [ ] Performance audit

## Rollback Procedure

If issues arise after deployment:

### 1. Disable Cron Jobs
Remove or comment out cron configuration in `vercel.json`:
```json
{
  "crons": []
}
```

Redeploy to disable scheduled execution.

### 2. Rollback Database Changes
```sql
-- Drop new tables (only if necessary)
DROP TABLE IF EXISTS archived_admin_logs;

-- Revert to previous migration
-- (restore from backup if needed)
```

### 3. Redeploy Previous Version
```bash
# Revert git commits
git revert HEAD
git push origin main

# Or deploy specific commit
vercel --prod --force
```

## Support & Resources

- **Vercel Cron Docs:** https://vercel.com/docs/cron-jobs
- **Cron Expression Tester:** https://crontab.guru/
- **Supabase Docs:** https://supabase.com/docs
- **Project Docs:** See `/docs/CRON_JOBS.md` for detailed job documentation

## Post-Deployment Checklist

After successful deployment:

- [ ] 2 automated cron jobs visible in Vercel dashboard (weekly-recrawl, cleanup-vectors)
- [ ] Manual test of all 4 jobs successful (including non-scheduled jobs)
- [ ] Database tables created correctly
- [ ] Environment variables set properly
- [ ] Monitoring/alerting configured
- [ ] Documentation updated
- [ ] Team notified of new cron jobs and manual trigger requirements
- [ ] First scheduled execution confirmed successful

## Example: Complete Deployment

```bash
# 1. Apply migration
psql $DATABASE_URL -f migrations/006_cron_jobs_support.sql

# 2. Generate secret
export CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "CRON_SECRET=$CRON_SECRET" >> .env.local

# 3. Set in Vercel (use Vercel CLI or dashboard)
vercel env add CRON_SECRET production

# 4. Deploy
vercel --prod

# 5. Test
curl -X POST "https://your-app.vercel.app/api/cron/weekly-recrawl" \
  -H "Authorization: Bearer $CRON_SECRET"

# 6. Check logs
psql $DATABASE_URL -c "SELECT * FROM admin_logs WHERE action LIKE 'CRON_%' ORDER BY timestamp DESC LIMIT 5;"
```

## Questions?

If you encounter issues not covered here:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Examine admin_logs table
4. Contact support with error messages
