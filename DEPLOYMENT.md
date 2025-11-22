# Deployment Guide

Complete guide for deploying the Universal IDE Platform to production.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Vercel Deployment](#vercel-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Domain & SSL](#domain--ssl)
- [Cron Jobs](#cron-jobs)
- [Monitoring & Observability](#monitoring--observability)
- [Troubleshooting](#troubleshooting)
- [Scaling](#scaling)

## Overview

The platform is designed to run on **Vercel** with **Supabase** as the database backend. This architecture provides:

- Serverless functions with automatic scaling
- Global CDN for static assets
- Built-in CI/CD with GitHub integration
- Zero-downtime deployments
- Automatic HTTPS/SSL

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│                    (Browser/Mobile)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                      │
│                      (Global CDN)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Application                        │
│                  (Serverless Functions)                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  API Routes  │  │   Chat UI    │  │  Admin Panel │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌─────────────────┐  ┌──────────────┐  ┌────────────┐
│    Supabase     │  │   OpenAI     │  │  OpenRouter│
│  (PostgreSQL    │  │  (LLM/Embed) │  │    (LLM)   │
│   + pgvector)   │  │              │  │            │
└─────────────────┘  └──────────────┘  └────────────┘
```

## Prerequisites

### Accounts & Services

1. **GitHub Account** - For version control and CI/CD
2. **Vercel Account** - For hosting (free Hobby plan sufficient for start)
3. **Supabase Account** - For database (free tier sufficient for start)
4. **OpenAI Account** - For embeddings and LLM (pay-as-you-go)
5. **Domain** (optional) - Custom domain for production

### Required API Keys

- Supabase URL and keys (anon, service role)
- OpenAI API key
- OpenRouter API key (optional)
- Google OAuth credentials (for sign-in)
- Cron secret token

## Vercel Deployment

### Initial Setup

1. **Connect GitHub Repository**

```bash
# Push your code to GitHub
git remote add origin https://github.com/your-username/universal-ide-platform.git
git push -u origin main
```

2. **Import to Vercel**

- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Select the repository
- Configure project settings:
  - Framework Preset: **Next.js**
  - Root Directory: `./`
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

3. **Configure Environment Variables**

In Vercel dashboard → Settings → Environment Variables, add:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-...

# OpenRouter (optional)
OPENROUTER_API_KEY=sk-or-...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production

# OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=...

# Cron Jobs
CRON_SECRET=your-secure-random-token

# Monitoring (optional)
SENTRY_DSN=https://...
```

**Important**: Set these for **Production**, **Preview**, and **Development** environments as needed.

4. **Deploy**

Click "Deploy" - Vercel will build and deploy automatically.

### Automatic Deployments

GitHub integration provides automatic deployments:

- **Production**: Pushes to `main` branch → deploys to production
- **Preview**: Pull requests → deploys preview environments
- **Branch**: Pushes to other branches → optional preview deployments

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Database Setup

### Supabase Production Setup

1. **Create Project**

- Go to [supabase.com](https://supabase.com)
- Create new project
- Choose region (closest to your users)
- Set strong database password
- Wait for project provisioning (~2 minutes)

2. **Apply Migrations**

```bash
# Set database URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Apply all migrations in order
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_rls_policies.sql
psql $DATABASE_URL -f migrations/003_seed_data.sql
psql $DATABASE_URL -f migrations/004_chat_system.sql
psql $DATABASE_URL -f migrations/005_auth_system.sql
psql $DATABASE_URL -f migrations/006_cron_jobs_support.sql
```

Or use Supabase CLI:

```bash
# Install Supabase CLI
npm i -g supabase

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

3. **Enable Extensions**

Verify pgvector is enabled (should be automatic):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. **Configure Authentication**

In Supabase Dashboard → Authentication:

- Enable Email/Password provider
- Enable Google OAuth provider
  - Add Client ID and Secret from Google Cloud Console
  - Set Redirect URL: `https://[PROJECT].supabase.co/auth/v1/callback`
- Configure email templates (optional)
- Set site URL: `https://your-domain.com`
- Add redirect URLs: `https://your-domain.com/auth/callback`

5. **Set Up RLS Policies**

Verify Row Level Security is enabled on all tables:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

### Database Backups

Enable automated backups in Supabase Dashboard:

- Go to Settings → Database
- Enable Point-in-Time Recovery (Pro plan)
- Set backup retention period
- Test restore procedure

Manual backup:

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## Environment Variables

### Production Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | `eyJhbGc...` |
| `OPENAI_API_KEY` | OpenAI API key | Yes | `sk-...` |
| `OPENROUTER_API_KEY` | OpenRouter API key | No | `sk-or-...` |
| `NEXT_PUBLIC_APP_URL` | Production app URL | Yes | `https://your-domain.com` |
| `NODE_ENV` | Environment | Yes | `production` |
| `CRON_SECRET` | Cron authentication token | Yes | Generated secure token |
| `SENTRY_DSN` | Sentry error tracking | No | `https://...` |
| `SLACK_WEBHOOK_URL` | Slack notifications | No | `https://hooks.slack.com/...` |

### Generate Secure Tokens

```bash
# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment-Specific Variables

Configure different values for each environment:

- **Production**: Public-facing production site
- **Preview**: Branch/PR preview deployments
- **Development**: Local development

Example: Use test/sandbox API keys for Preview/Development environments.

## Domain & SSL

### Custom Domain Setup

1. **Add Domain in Vercel**

- Go to Project Settings → Domains
- Add your domain: `your-domain.com`
- Add www subdomain: `www.your-domain.com`

2. **Configure DNS**

Add these records in your domain registrar:

```
Type    Name    Value                           TTL
A       @       76.76.21.21                    Auto
CNAME   www     cname.vercel-dns.com.          Auto
```

Or use Vercel nameservers for full management.

3. **Verify SSL**

- Vercel automatically provisions SSL certificates
- Wait 5-10 minutes for propagation
- Verify HTTPS: `https://your-domain.com`

### Redirect Configuration

Set up redirects in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/docs",
      "destination": "/docs/getting-started",
      "permanent": false
    }
  ]
}
```

## Cron Jobs

### Vercel Cron Configuration

Cron jobs are configured in `vercel.json`:

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

### Cron Setup Steps

1. **Set CRON_SECRET**

Generate and set in Vercel environment variables:

```bash
CRON_SECRET=your-secure-token
```

2. **Deploy to Production**

Cron jobs only work on production deployments (Hobby plan or higher).

3. **Verify Execution**

Check Vercel logs or admin_logs table:

```sql
SELECT * FROM admin_logs 
WHERE action LIKE 'CRON_%' 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Manual Cron Triggers

Test cron jobs manually:

```bash
curl -X POST https://your-domain.com/api/cron/weekly-recrawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Cron Monitoring

Monitor cron job execution:

- Check Vercel Function Logs
- Check admin_logs table
- Set up alerts for failures (Slack/email)

## Monitoring & Observability

### Error Tracking (Sentry)

1. **Setup Sentry**

```bash
npm install @sentry/nextjs
```

2. **Configure Sentry**

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV
})
```

3. **Set SENTRY_DSN**

Add to Vercel environment variables.

### Uptime Monitoring (UptimeRobot)

1. **Create UptimeRobot Account** (free tier)

2. **Add Monitors**

- Main site: `https://your-domain.com`
- Health endpoint: `https://your-domain.com/api/health`
- Check interval: 5 minutes
- Alert contacts: Email, Slack

3. **Configure Alerts**

- Email notifications
- Slack webhooks
- SMS (paid plans)

### Vercel Logs

Access logs in Vercel Dashboard:

- Functions → View logs
- Filter by function/time
- Search for errors
- Export logs (Pro plan)

### Performance Monitoring

Monitor performance metrics:

- **Response Times**: Target < 2s for prompts, < 5s for chat
- **Error Rates**: Keep < 1%
- **Uptime**: Target 99.9%

Check Vercel Analytics (Pro plan):

- Real User Metrics (RUM)
- Core Web Vitals
- Function execution times

### Database Monitoring

Monitor in Supabase Dashboard:

- Database size and growth
- Query performance
- Connection pool usage
- Table sizes and indexes

Set up alerts for:

- High CPU usage (> 80%)
- Disk usage (> 80%)
- Connection limits
- Slow queries (> 1s)

### Usage Analytics (Optional)

**Mixpanel Setup**:

```typescript
// lib/analytics.ts
import mixpanel from 'mixpanel-browser'

mixpanel.init(process.env.MIXPANEL_TOKEN!)

export const trackEvent = (event: string, properties?: object) => {
  if (process.env.NODE_ENV === 'production') {
    mixpanel.track(event, properties)
  }
}
```

**Datadog Setup**:

```typescript
// lib/datadog.ts
import { datadogLogs } from '@datadog/browser-logs'

datadogLogs.init({
  clientToken: process.env.DATADOG_API_KEY!,
  site: 'datadoghq.com',
  forwardErrorsToLogs: true,
  sampleRate: 100
})
```

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: Build fails on Vercel

**Solution**:
```bash
# Check build locally
npm run build

# Check TypeScript errors
npm run type-check

# Check linting
npm run lint
```

#### Environment Variables Not Working

**Issue**: Environment variables undefined at runtime

**Solution**:
- Verify variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Client-side variables must start with `NEXT_PUBLIC_`
- Redeploy after adding new variables

#### Database Connection Issues

**Issue**: Can't connect to Supabase

**Solution**:
```bash
# Test connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Check RLS policies
# Verify service role key is correct
# Check Supabase project status
```

#### Cron Jobs Not Running

**Issue**: Cron jobs not executing

**Solution**:
- Verify production deployment (crons don't work on preview)
- Check Vercel plan (Hobby or higher required)
- Verify CRON_SECRET is set
- Check Function Logs for errors
- Ensure vercel.json is in root directory

#### Slow Performance

**Issue**: API responses are slow

**Solution**:
```bash
# Check Vercel Function Logs for execution times
# Monitor Supabase query performance
# Add database indexes if needed
# Enable caching for static content
# Optimize vector search queries
```

### Debug Mode

Enable debug logging:

```bash
# Set in Vercel environment variables
DEBUG=true
LOG_LEVEL=debug
```

### Support Channels

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **GitHub Issues**: For app-specific bugs
- **Documentation**: Check `/docs` directory

## Scaling

### Traffic Growth

**Free Tier Limits**:
- Vercel Hobby: 100GB bandwidth, 100 hours compute
- Supabase Free: 500MB database, 50MB file storage

**Scaling Path**:

1. **Small Scale** (< 10k users)
   - Vercel Hobby plan: $20/month
   - Supabase Pro plan: $25/month
   - Estimated cost: ~$50/month

2. **Medium Scale** (< 100k users)
   - Vercel Pro plan: $150/month
   - Supabase Pro + compute: $100-200/month
   - OpenAI usage: ~$50-100/month
   - Estimated cost: ~$300-450/month

3. **Large Scale** (100k+ users)
   - Vercel Enterprise: Custom pricing
   - Supabase Enterprise: Custom pricing
   - Dedicated compute resources
   - Consider caching layer (Redis)
   - CDN optimization

### Performance Optimization

**Database Optimization**:
```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_doc_chunks_ide_id ON doc_chunks(ide_id);
CREATE INDEX CONCURRENTLY idx_chat_history_user_id ON chat_history(user_id);

-- Vacuum and analyze regularly (automated via cron)
VACUUM ANALYZE doc_chunks;
VACUUM ANALYZE chat_history;
```

**Caching**:
```typescript
// Add Redis for API response caching
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
})

// Cache embeddings
await redis.set(`embedding:${hash}`, embedding, { ex: 3600 })
```

**CDN Optimization**:
- Enable Vercel Edge Network
- Cache static assets aggressively
- Use ISR (Incremental Static Regeneration) for IDE listings

### Cost Optimization

- Monitor OpenAI usage (embeddings are expensive)
- Cache embeddings aggressively
- Use smaller models when possible
- Implement rate limiting
- Archive old data regularly

### High Availability

- Enable Supabase PITR (Point-in-Time Recovery)
- Set up automated backups
- Configure health checks
- Monitor uptime and errors
- Have rollback plan ready

## Launch Checklist

Before going live:

- [ ] All tests passing
- [ ] Production environment variables set
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] OAuth configured and tested
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Cron jobs configured and tested
- [ ] Monitoring and alerts set up
- [ ] Error tracking configured
- [ ] Documentation complete
- [ ] Admin account created
- [ ] Initial IDEs ingested and tested
- [ ] Backups configured
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Rate limiting tested
- [ ] Load testing completed (optional)

## Post-Launch

- Monitor error rates and response times
- Review logs daily for first week
- Gather user feedback
- Plan feature roadmap
- Set up regular maintenance windows
- Keep dependencies updated
- Review security advisories

---

Need help? Check [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue.
