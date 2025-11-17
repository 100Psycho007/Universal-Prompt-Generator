# Implementation Guide - Authentication & User System

## Quick Start

### 1. Set up Supabase Project

1. Create a new Supabase project at https://supabase.com
2. Get your project credentials:
   - Project URL
   - Anon public key
   - Service role key

3. Configure OAuth (optional):
   - Create a Google OAuth app in Google Cloud Console
   - Get Client ID and Client Secret
   - Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`

### 2. Configure Environment Variables

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Migrations

```bash
# Push all migrations
supabase db push

# Or run specific migration
psql $DATABASE_URL < migrations/005_auth_and_roles.sql
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and start using the authentication system!

## File Structure

```
app/
├── auth/
│   ├── layout.tsx              # Auth pages layout
│   ├── signup/page.tsx         # Signup page
│   ├── login/page.tsx          # Login page
│   └── reset-password/page.tsx # Password reset
├── admin/
│   └── page.tsx                # Admin dashboard
├── api/
│   └── auth/
│       └── callback/route.ts   # OAuth callback
├── layout.tsx                  # Root layout with AuthProvider
├── page.tsx                    # Home page
└── globals.css                 # Global styles

lib/
├── auth-context.tsx            # Auth React context
├── supabase-auth-client.ts    # Auth utilities
└── supabase-client.ts         # Supabase client (existing)

migrations/
└── 005_auth_and_roles.sql     # Auth schema migration

types/
└── database.ts                # Updated with auth types
```

## Key Features

### Email/Password Authentication
- User signup with email, password, and full name
- Email verification (configurable in Supabase)
- Login with existing credentials
- Logout functionality

### Google OAuth
- One-click Google signup/login
- Automatic user profile creation for OAuth users
- Proper error handling and redirects

### Password Reset
- Email-based password recovery
- Secure reset token handling by Supabase
- Password update flow

### Session Management
- JWT tokens with auto-refresh
- Session persistence across browser sessions
- Auth state synced across tabs
- Automatic cleanup on logout

### User Profiles
- Full name, email, preferences
- Theme preference (light/dark)
- Default IDE preference
- Created via metadata

### Role-Based Access
- User (default) - full access to IDE data
- Admin - access to admin dashboard and management

### Guest Mode
- Browse IDEs without authentication
- View prompt generator (results not persisted)
- Prompted to sign up for full features

## Admin Dashboard Features

### IDEs Management
- View all IDEs with chunk counts
- Monitor ingest status
- Trigger manual re-crawl operations
- Track completion/errors

### Users Management
- View all registered users
- See user roles (user/admin)
- Manage user roles

### API Usage Statistics
- Total requests and endpoints
- Response time analytics
- Success rate tracking
- Per-user usage tracking

### Admin Logs
- Track all admin actions
- Filter by IDE
- Audit trail

## Customization

### Styling
The default implementation uses Tailwind CSS with a dark theme. Customize in:
- `app/globals.css` - Global styles
- Individual page components - Tailwind classes

### Authentication Flow
Customize signup/login/reset password pages:
- `app/auth/signup/page.tsx`
- `app/auth/login/page.tsx`
- `app/auth/reset-password/page.tsx`

### User Profile Fields
Modify the `profile` JSONB column in the `users` table:
- Update `lib/supabase-auth-client.ts` for default values
- Update `UserProfile` type in `lib/supabase-auth-client.ts`

### Admin Dashboard
Customize what admins see:
- Edit `app/admin/page.tsx`
- Add/remove tables and statistics
- Implement additional admin actions

## Database Operations

### Create Admin User
```sql
UPDATE users SET role = 'admin' WHERE id = 'user-uuid';
```

### View All Users
```sql
SELECT id, email, role, is_guest, created_at FROM users ORDER BY created_at DESC;
```

### Check IDEs Created By User
```sql
SELECT * FROM ides WHERE created_by = 'user-uuid';
```

### View API Usage for User
```sql
SELECT endpoint, COUNT(*) as count, AVG(response_time_ms) as avg_time
FROM api_usage_stats
WHERE user_id = 'user-uuid'
GROUP BY endpoint;
```

## API Protection

To protect API routes, use this pattern:

```typescript
import { getCurrentUserProfile } from '@/lib/supabase-auth-client'

export async function GET(request: NextRequest) {
  const { profile, error } = await getCurrentUserProfile()
  
  if (error || !profile) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Admin-only check
  if (profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  // Your API logic here
}
```

## Deployment Considerations

### Production Setup
1. Configure Supabase project with production settings
2. Enable email verification
3. Set up SMTP for transactional emails
4. Configure proper OAuth redirect URIs
5. Set secure cookies in production

### Environment
```
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=prod_service_role_key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Security Checklist
- [ ] Service role key never exposed to client
- [ ] Environment variables securely configured
- [ ] RLS policies properly set
- [ ] Email verification enabled
- [ ] OAuth redirect URIs correct
- [ ] Rate limiting configured
- [ ] Session timeouts reasonable

## Troubleshooting

### Users Cannot Sign Up
1. Check email verification setting in Supabase
2. Verify EMAIL_FROM environment variable in Supabase
3. Check spam folder for verification email
4. Review Supabase logs for errors

### OAuth Redirect Issues
1. Verify redirect URI in Supabase matches frontend
2. Check Google OAuth credentials are valid
3. Ensure `NEXT_PUBLIC_APP_URL` is correct
4. Check browser console for error messages

### Session Not Persisting
1. Verify localStorage is not disabled
2. Check cookies are not blocked
3. Ensure auth settings in supabase-client.ts are correct

### Admin Dashboard Shows No Data
1. Verify user has admin role
2. Check RLS policies are created
3. Verify service role key is set
4. Check Supabase logs for RLS errors

## Next Steps

1. Configure Supabase with your credentials
2. Run migrations
3. Test signup/login flows
4. Customize styling and user profile fields
5. Implement API protection on existing routes
6. Set up email verification
7. Deploy to production

## Related Documentation
- See `AUTH.md` for technical documentation
- See `MIGRATIONS.md` for database information
- See existing `README.md` for project overview
