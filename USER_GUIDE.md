# Universal IDE Platform — User Guide

This guide explains how to use the Universal IDE Platform as an end user or admin.

## Table of Contents

- [Introduction](#introduction)
- [Access & Authentication](#access--authentication)
- [Dashboard Overview](#dashboard-overview)
- [Working with IDEs](#working-with-ides)
- [Prompt Generator](#prompt-generator)
- [Chat Assistant (RAG)](#chat-assistant-rag)
- [Manifest Viewer](#manifest-viewer)
- [Guest Experience](#guest-experience)
- [Admin Features](#admin-features)
- [Tips & Best Practices](#tips--best-practices)
- [FAQs](#faqs)
- [Support](#support)

## Introduction

The Universal IDE Platform provides:

- A searchable catalog of IDEs
- Documentation ingestion and chunking
- Prompt generation tailored to each IDE
- RAG-powered chat assistant with citations
- Admin tools for ingesting and monitoring IDE data

## Access & Authentication

### Sign Up & Login

Navigate to `/auth/signup` or `/auth/login`. Supported flows:

- Email + password
- Google OAuth

### Password Reset

- Go to `/auth/reset-password`
- Request reset link
- Check email and follow instructions

### User Roles

| Role | Description |
|------|-------------|
| **Guest** | View IDE catalog and limited prompt generation |
| **User** | Full access to prompts, chat, saved history |
| **Admin** | Manage IDEs, monitor ingestion, view analytics |

### Admin Account Creation

Admins are created by setting `role = 'admin'` in Supabase `users` table:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@your-domain.com';
```

## Dashboard Overview

### Sidebar

- **IDE List**: Filter and select IDEs
- **Manifest Viewer**: Explore IDE metadata and templates
- **Admin Links**: Access admin panel, monitoring, logs

### Main Area

- **Prompt Generator**: Input tasks and get tailored prompts
- **Chat Assistant**: Multi-turn RAG chat with citations
- **History**: View past chats and prompts

## Working with IDEs

1. **Select an IDE**: Use sidebar list or search
2. **View Metadata**: Manifest viewer shows version, sources, templates
3. **Rebuild Manifest** (admin): Click "Rebuild Manifest" to re-ingest
4. **Switch IDEs**: Sidebar updates active IDE context

Currently available IDEs (sample list):

- Cursor
- VSCode
- JetBrains (IntelliJ, WebStorm)
- Neovim
- Emacs
- Zed
- Fleet
- Sublime Text
- Eclipse
- Xcode
- Android Studio
- GoLand
- PyCharm
- CLion
- Rider
- DataGrip
- PhpStorm
- RubyMine
- AppCode
- Visual Studio

> ⚠️ The platform ships with 20+ IDEs pre-ingested. Use admin tools to add more.

## Prompt Generator

1. **Describe Task**: Provide detailed description
2. **Generate**: Click "Generate Prompt"
3. **Review Output**: Includes context, code snippets, best practices
4. **Sources**: Links to docs used for generation

### Tips

- Include technologies/tools (e.g., "React", "TypeScript")
- Mention desired output format
- Use natural language

## Chat Assistant (RAG)

### Features

- Multi-turn chat with history
- Retrieval from relevant documentation chunks
- Citations with sections and similarity scores
- Token usage display
- Confidence indicators (High/Medium/Low)
- Copy-to-clipboard functionality
- Loading indicator with typing animation

### Keyboard Shortcuts

- **Cmd/Ctrl + Enter**: Send message
- **Esc**: Clear input
- **Cmd/Ctrl + K**: Focus input (desktop)

### Best Practices

- Ask specific questions
- Provide context or code snippets
- Reference IDE version if relevant

### Conversation History

- Stored in Supabase `chat_history`
- Auto-saves conversation metadata
- Accessible via `/api/chat/history`

## Manifest Viewer

Displays IDE manifest as structured sections:

- **Overview**: Name, version, trusted status
- **Sources**: Documentation URLs, crawl timestamps
- **Templates**: Prompt templates and slots
- **Validation Rules**: Input constraints and guidelines
- **Formats**: Preferred/fallback output formats
- **Last Updated**: Timestamp of last crawl/validation

Admin-only actions:

- **Rebuild Manifest**: Regenerates manifest and revalidates
- **Validate Now**: Runs manifest validation cron (if available)

## Guest Experience

- Browse IDE catalog without signup
- View limited manifest data
- Generate sample prompts (masked output)
- Chat responses limited to first 2 messages
- Encouraged to sign up for full features

## Admin Features

### Admin Dashboard `/admin`

Tabs:

1. **IDE Management**
   - View ingestion status per IDE
   - Trigger re-crawls/re-embeddings
   - Check chunk counts and coverage

2. **Users**
   - View user list and roles
   - Promote/demote admins
   - Reset user passwords (optional)

3. **API Usage**
   - Request counts
   - Response times
   - Error rates

4. **Logs & Monitoring**
   - View structured logs
   - Filter by severity/action
   - Export logs

5. **Cron Status**
   - Last run timestamps
   - Duration and result
   - Manual trigger buttons

### Monitoring Page `/admin/monitor`

- Overview metrics (success rate, total calls)
- Performance metrics (avg, p95, p99)
- Error trends by status code
- Real-time log streaming
- Refresh intervals: 10s, 30s, 1m

### Alerts

- **Sentry**: Error tracking
- **Vercel Logs**: Function errors and performance
- **UptimeRobot**: Availability monitoring
- **Datadog/Mixpanel** (optional): Usage analytics

## Tips & Best Practices

- Provide detailed prompts for better outputs
- Use manifest viewer to verify templates
- Track token usage to avoid hitting limits
- Use citations to jump back to docs quickly
- Configure alerts for critical cron jobs
- Keep IDE ingestion up-to-date

## FAQs

**Q: How do I add a new IDE?**
- Go to Admin → IDE Management → Add New
- Provide name, seed URLs, crawl settings
- System crawls, chunks, embeds automatically

**Q: How do I reset my password?**
- Go to `/auth/reset-password`
- Enter email and follow instructions sent to inbox

**Q: Can I export chat history?**
- Yes. Use admin panel or call `/api/chat/history`

**Q: How do I see which docs were used?**
- Check citations below each response

**Q: How do I monitor cron jobs?**
- Visit Admin → Logs or `/admin/monitor`
- Cron jobs log to `admin_logs` table with action prefix `CRON_`

**Q: How do I create another admin?**
```sql
UPDATE users SET role = 'admin' WHERE email = 'teammate@company.com';
```

**Q: How do I trigger a re-crawl?**
```bash
curl -X POST https://your-domain.com/api/cron/weekly-recrawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Q: Is there a mobile view?**
- Yes. Sidebar collapses into top-level menu on mobile devices

**Q: How are prompts saved?**
- Stored in `user_prompts` table with metadata

## Support

- **Self-Serve Docs**: `/docs` directory in repo
- **API Reference**: [API.md](./API.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **How-To Videos**: Coming soon
- **Issues**: GitHub Issues
- **Email**: support@your-domain.com (configure in production)

Need more help? Reach out via GitHub or email.
