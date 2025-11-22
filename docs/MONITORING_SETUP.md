# Monitoring & Observability Setup

Complete guide for setting up monitoring and observability for the Universal IDE Platform.

## Overview

This guide covers:
- Error tracking with Sentry
- Uptime monitoring with UptimeRobot
- Analytics with Mixpanel and Datadog
- Vercel Logs integration
- Custom dashboards and alerts

## Error Tracking - Sentry

### Setup

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Create new organization
   - Create new project (type: Next.js)

2. **Install Sentry SDK**
   ```bash
   npm install @sentry/nextjs
   ```

3. **Configure Sentry**

   Create `sentry.client.config.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
     integrations: [
       new Sentry.BrowserTracing(),
       new Sentry.Replay({
         maskAllText: true,
         blockAllMedia: true,
       }),
     ],
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   })
   ```

   Create `sentry.server.config.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
     beforeSend(event) {
       // Don't send certain errors
       if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
         return null
       }
       return event
     },
   })
   ```

   Create `sentry.edge.config.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     tracesSampleRate: 0.1,
   })
   ```

4. **Add Environment Variable**
   ```bash
   # .env.local
   SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
   ```

5. **Integrate with Logger**

   Update `lib/logger.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   export const Logger = {
     error: (params: LogParams) => {
       console.error('ERROR:', params)
       
       if (process.env.NODE_ENV === 'production' && params.error) {
         Sentry.captureException(params.error, {
           level: 'error',
           tags: {
             action: params.action,
             userId: params.userId,
           },
           extra: params.metadata,
         })
       }
     },
   }
   ```

### Alerts

Configure alerts in Sentry dashboard:
- High error rate (> 10 errors/min)
- New error types
- Performance degradation
- Database errors

## Uptime Monitoring - UptimeRobot

### Setup

1. **Create UptimeRobot Account**
   - Go to [uptimerobot.com](https://uptimerobot.com)
   - Free plan: 50 monitors, 5-minute intervals

2. **Create Monitors**

   **Main Site Monitor**:
   - Type: HTTP(s)
   - URL: `https://your-domain.com`
   - Interval: 5 minutes
   - Alert when down for: 2 minutes

   **Health Endpoint Monitor**:
   - Type: HTTP(s)
   - URL: `https://your-domain.com/api/health`
   - Interval: 5 minutes
   - Keyword alert: Look for `"status":"healthy"`

   **Cron Job Monitor** (optional):
   - Type: Heartbeat
   - Add to cron jobs:
     ```bash
     curl $UPTIMEROBOT_HEARTBEAT_URL
     ```

3. **Configure Alerts**
   - Email notifications
   - Slack webhooks (integrate with UptimeRobot)
   - SMS (paid plans)

### Vercel Integration

Alternatively, use Vercel's built-in monitoring (Pro plan):
- Automatic uptime checks
- Real User Monitoring (RUM)
- Core Web Vitals
- Function execution times

## Analytics - Mixpanel

### Setup

1. **Create Mixpanel Account**
   - Go to [mixpanel.com](https://mixpanel.com)
   - Create new project

2. **Install Mixpanel**
   ```bash
   npm install mixpanel-browser
   ```

3. **Configure Analytics**

   Create `lib/analytics.ts`:
   ```typescript
   import mixpanel from 'mixpanel-browser'

   const isProd = process.env.NODE_ENV === 'production'
   const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN

   if (isProd && token) {
     mixpanel.init(token, {
       debug: false,
       track_pageview: true,
       persistence: 'localStorage',
     })
   }

   export const analytics = {
     track: (event: string, properties?: object) => {
       if (isProd && token) {
         mixpanel.track(event, properties)
       }
     },
     
     identify: (userId: string) => {
       if (isProd && token) {
         mixpanel.identify(userId)
       }
     },
     
     setUserProperties: (properties: object) => {
       if (isProd && token) {
         mixpanel.people.set(properties)
       }
     },
   }
   ```

4. **Track Key Events**

   ```typescript
   // User events
   analytics.track('User Signed Up', { method: 'email' })
   analytics.track('User Logged In', { method: 'google' })
   
   // Feature usage
   analytics.track('Prompt Generated', { ideId, taskLength: task.length })
   analytics.track('Chat Message Sent', { ideId, conversationLength })
   analytics.track('IDE Selected', { ideId, ideName })
   
   // Admin events
   analytics.track('IDE Ingested', { ideId, chunkCount })
   analytics.track('Cron Job Completed', { job: 'weekly-recrawl', duration })
   ```

### Dashboards

Create dashboards for:
- Daily Active Users (DAU)
- Feature adoption rates
- User retention cohorts
- Conversion funnels
- Most popular IDEs

## Metrics - Datadog (Optional)

### Setup

1. **Create Datadog Account**
   - Go to [datadoghq.com](https://datadoghq.com)
   - Choose appropriate plan

2. **Install Datadog**
   ```bash
   npm install @datadog/browser-logs @datadog/browser-rum
   ```

3. **Configure Datadog**

   Create `lib/datadog.ts`:
   ```typescript
   import { datadogLogs } from '@datadog/browser-logs'
   import { datadogRum } from '@datadog/browser-rum'

   if (process.env.NODE_ENV === 'production') {
     // Real User Monitoring
     datadogRum.init({
       applicationId: process.env.NEXT_PUBLIC_DATADOG_APP_ID!,
       clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN!,
       site: 'datadoghq.com',
       service: 'universal-ide-platform',
       env: process.env.NODE_ENV,
       version: process.env.NEXT_PUBLIC_APP_VERSION,
       sessionSampleRate: 100,
       sessionReplaySampleRate: 20,
       trackUserInteractions: true,
       trackResources: true,
       trackLongTasks: true,
     })

     // Logs
     datadogLogs.init({
       clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN!,
       site: 'datadoghq.com',
       forwardErrorsToLogs: true,
       sessionSampleRate: 100,
     })
   }
   ```

4. **Track Metrics**

   ```typescript
   import { datadogLogs } from '@datadog/browser-logs'

   // Custom metrics
   datadogLogs.logger.info('Prompt generated', {
     duration: responseTime,
     ideId,
     chunkCount,
   })

   // Performance metrics
   datadogLogs.logger.info('API call', {
     endpoint: '/api/chat',
     duration: responseTime,
     statusCode: 200,
   })
   ```

### Custom Metrics

Track:
- API response times
- Database query times
- Cache hit rates
- Embedding generation times
- LLM latencies

## Vercel Logs

### Access Logs

1. **Vercel Dashboard**
   - Go to project → Functions
   - Click on function to view logs
   - Filter by time, function, status

2. **Vercel CLI**
   ```bash
   vercel logs [deployment-url] --follow
   vercel logs [deployment-url] --since 1h
   ```

3. **Log Streaming** (Pro plan)
   - Integrate with external services
   - Stream to Datadog, Loggly, etc.

### Log Retention

- Hobby plan: 1 hour
- Pro plan: 7 days
- Enterprise: Custom

## Custom Monitoring Dashboard

### Admin Dashboard

The platform includes a built-in monitoring dashboard at `/admin/monitor`:

**Overview Tab**:
- Total API calls
- Success rate
- Error count
- Average response time

**Performance Tab**:
- Response time trends
- P95, P99 latencies
- Target compliance

**Errors Tab**:
- Error trends by status code
- Most common errors
- Error distribution

**Logs Tab**:
- Real-time admin logs
- Filter by action/severity
- Export logs

### Database Monitoring

Query admin logs:
```sql
-- API usage stats
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as requests,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
  SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errors
FROM api_usage_stats
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Cron job status
SELECT * FROM admin_logs
WHERE action LIKE 'CRON_%'
ORDER BY timestamp DESC
LIMIT 20;

-- Error trends
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as error_count
FROM admin_logs
WHERE severity = 'ERROR'
GROUP BY day
ORDER BY day DESC;
```

## Alerts Configuration

### Slack Alerts

1. **Create Slack Webhook**
   - Go to Slack → Apps → Incoming Webhooks
   - Create webhook for your channel
   - Copy webhook URL

2. **Set Environment Variable**
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
   ```

3. **Send Alerts**

   Update `lib/cron-utils.ts`:
   ```typescript
   export async function notifyFailure(job: string, error: string) {
     // Log to database
     await Logger.error({
       action: `CRON_${job.toUpperCase()}_FAILED`,
       error: new Error(error),
     })

     // Send Slack notification
     if (process.env.SLACK_WEBHOOK_URL) {
       await fetch(process.env.SLACK_WEBHOOK_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           text: `⚠️ Cron job failed: ${job}`,
           blocks: [
             {
               type: 'section',
               text: {
                 type: 'mrkdwn',
                 text: `*Cron Job Failed*\n\n*Job:* ${job}\n*Error:* ${error}`,
               },
             },
           ],
         }),
       })
     }
   }
   ```

### Email Alerts

1. **Configure Email Service** (e.g., SendGrid, AWS SES)

2. **Send Alerts**
   ```typescript
   import sgMail from '@sendgrid/mail'

   sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

   export async function sendErrorEmail(error: string) {
     await sgMail.send({
       to: process.env.ADMIN_EMAIL!,
       from: 'alerts@your-domain.com',
       subject: '[Alert] Universal IDE Platform Error',
       text: error,
     })
   }
   ```

## Best Practices

1. **Don't Over-Monitor**
   - Focus on actionable metrics
   - Avoid alert fatigue
   - Set appropriate thresholds

2. **Aggregate Logs**
   - Use structured logging
   - Include context (userId, requestId)
   - Tag events properly

3. **Set Up Runbooks**
   - Document common issues
   - Include remediation steps
   - Keep runbooks updated

4. **Review Regularly**
   - Weekly error review
   - Monthly performance review
   - Quarterly cost review

5. **Test Alerts**
   - Trigger test alerts
   - Verify notification channels
   - Update on-call rotations

## Cost Optimization

**Free Tiers**:
- Sentry: 5,000 errors/month
- UptimeRobot: 50 monitors
- Mixpanel: 100k events/month
- Vercel: Basic logs included

**Paid Plans** (if needed):
- Sentry Team: $26/month
- UptimeRobot Pro: $7/month
- Mixpanel Growth: $25/month
- Datadog: Custom pricing

## Support

- **Sentry**: [docs.sentry.io](https://docs.sentry.io)
- **UptimeRobot**: [blog.uptimerobot.com](https://blog.uptimerobot.com)
- **Mixpanel**: [help.mixpanel.com](https://help.mixpanel.com)
- **Datadog**: [docs.datadoghq.com](https://docs.datadoghq.com)
- **Vercel**: [vercel.com/docs/concepts/observability](https://vercel.com/docs/concepts/observability)
