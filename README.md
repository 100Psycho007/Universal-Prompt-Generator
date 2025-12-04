# Universal IDE Platform

AI-powered documentation platform with RAG chat, custom doc uploads, and PRD generation.

## Quick Start

```bash
# Install
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run
npm run dev
```

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_database_url
```

## Database Setup

Run migrations in Supabase SQL Editor (in order):
1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_seed_data.sql`
4. `migrations/004_vector_search_functions.sql`
5. `migrations/005_auth_enhancements.sql`
6. `migrations/006_cron_jobs_support.sql`
7. `migrations/007_custom_docs.sql`
8. `migrations/008_fix_rls_policies.sql`

## Features

- 🤖 RAG-powered chat with AI coding agents
- 📁 Upload custom documentation (files/URLs/paste)
- 📄 Generate comprehensive PRDs
- 🔍 Vector semantic search
- 🔐 User authentication & isolation

## Tech Stack

Next.js 14 • TypeScript • Supabase • OpenAI • pgvector

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

See `DEPLOYMENT.md` for details.
