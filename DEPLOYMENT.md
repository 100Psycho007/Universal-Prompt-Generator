# Deployment Guide

## Vercel Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
DATABASE_URL=
```

## Database Setup

1. Create Supabase project
2. Run migrations in SQL Editor (001-008)
3. Get connection string
4. Update DATABASE_URL

## Post-Deployment

1. Test authentication
2. Upload test document
3. Try chat feature
4. Generate test PRD

## Troubleshooting

- **406 errors**: Run migration 008
- **Auth issues**: Check Supabase keys
- **Upload fails**: Verify OpenAI key
- **Chat errors**: Ensure migrations applied
