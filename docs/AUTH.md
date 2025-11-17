# Authentication & User System

This document describes the authentication and user management system for the Universal IDE Database.

## Overview

The application uses Supabase Auth for authentication with support for:
- Email/password authentication
- Google OAuth
- Email verification
- Password reset
- Session management with JWT tokens
- Role-based access control (RBAC)
- Guest mode for unauthenticated users

## Architecture

### Components

1. **Auth Context** (`lib/auth-context.tsx`)
   - React Context for managing global auth state
   - Provides user profile, admin status, and guest mode flag
   - Auto-refreshes user state on app load
   - Subscribes to Supabase auth changes

2. **Auth Utilities** (`lib/supabase-auth-client.ts`)
   - Signup, login, logout functions
   - OAuth integration
   - Password reset flow
   - User profile management
   - Admin operations

3. **Authentication Pages**
   - `/app/auth/signup/page.tsx` - New user registration
   - `/app/auth/login/page.tsx` - User login
   - `/app/auth/reset-password/page.tsx` - Password recovery

4. **API Routes**
   - `/app/api/auth/callback/route.ts` - OAuth redirect handler
   - Creates user profiles for new OAuth users
   - Handles authentication errors

5. **Middleware** (`middleware.ts`)
   - Manages session state across routes
   - Handles auth state persistence

6. **Admin Dashboard** (`/app/admin`)
   - View all IDEs with ingest status
   - Manage users and roles
   - View API usage statistics
   - Monitor admin logs
   - Trigger manual doc re-crawl

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  profile JSONB,
  preferences JSONB,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
)
```

### IDEs Table (Updated)
```sql
ALTER TABLE ides ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE ides ADD COLUMN updated_by UUID REFERENCES users(id);
```

### Ingest Status Table
Tracks documentation crawl operations:
```sql
CREATE TABLE ingest_status (
  id UUID PRIMARY KEY,
  ide_id UUID NOT NULL REFERENCES ides(id),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  chunks_processed INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### API Usage Stats Table
```sql
CREATE TABLE api_usage_stats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP
)
```

## Row Level Security (RLS)

### User Tables
- Users can only view/update their own profile
- Users can only access their own prompts and chat history

### IDE Tables
- Authenticated users can read IDEs and doc_chunks
- Admin-only access to ingest status and API stats

### Admin Tables
- Service role only for admin logs

## Guest Mode

### Features
- Browse available IDEs
- View prompt generator (results not persisted)
- Limited ingest access
- No chat history
- No saved prompts

### Limitations
- Cannot save work
- Cannot access chat history
- Limited to viewing public IDE information
- Prompted to sign up for full features

## User Roles

### User
- Default role for new signups
- Full access to IDE database
- Can create and save prompts
- Can manage chat history
- Can update profile

### Admin
- All user permissions
- Access to admin dashboard
- View all users and their stats
- Manage IDE ingest status
- Trigger manual crawls
- View API usage statistics
- Access admin logs

## Authentication Flow

### Email/Password Signup
1. User fills signup form with email, password, full name
2. Supabase creates auth user and sends verification email
3. User profile created in `users` table
4. User redirected to login after verification
5. Session automatically created on successful login

### Google OAuth
1. User clicks "Sign in with Google"
2. Redirected to Google consent screen
3. After approval, redirected to `/auth/callback`
4. Exchange code for session
5. Create user profile if first time
6. Redirect to home page

### Password Reset
1. User requests password reset
2. Email sent with reset link
3. User clicks link (opens `/auth/reset-password?type=recovery`)
4. User enters new password
5. Password updated in Supabase Auth
6. Redirect to login

## Security Considerations

1. **Session Management**
   - JWT tokens auto-refresh
   - Session persists in localStorage
   - Auth state synced across tabs

2. **Password Requirements**
   - Minimum 8 characters
   - Handled by Supabase Auth

3. **Row Level Security**
   - All user-facing tables have RLS enabled
   - Service role key used server-side only
   - Never exposed to client

4. **OAuth**
   - Redirect URI must match Supabase OAuth configuration
   - Code exchange handled server-side

5. **Email Verification**
   - Enabled on Supabase project
   - Users must verify email before full access (configurable)

## Usage Examples

### Using Auth Context
```tsx
import { useAuth } from '@/lib/auth-context'

export default function MyComponent() {
  const { user, userProfile, isAdmin, isGuest, refreshUser } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (isGuest) return <div>Please sign up</div>

  if (isAdmin) return <AdminPanel />

  return <UserDashboard profile={userProfile} />
}
```

### Signup
```tsx
import { signUp } from '@/lib/supabase-auth-client'

const { data, error } = await signUp({
  email: 'user@example.com',
  password: 'securepassword',
  fullName: 'John Doe'
})
```

### Login
```tsx
import { logIn } from '@/lib/supabase-auth-client'

const { data, error } = await logIn({
  email: 'user@example.com',
  password: 'password'
})
```

### Check Admin Status
```tsx
import { isUserAdmin } from '@/lib/supabase-auth-client'

const isAdmin = await isUserAdmin(userId)
```

## Environment Variables

Required environment variables for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `NEXT_PUBLIC_APP_URL` - Application URL (for OAuth callbacks)

## Testing

### Local Development
1. Start Supabase locally: `supabase start`
2. Run migrations: `supabase db push`
3. Set environment variables in `.env.local`
4. Start dev server: `npm run dev`

### Test Accounts
Create test users via the Supabase dashboard or use signup/login pages.

## Troubleshooting

### Session Not Persisting
- Check browser localStorage is enabled
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check auth.persistSession is true in supabase-client.ts

### RLS Errors
- Verify RLS policies are created: `supabase db push`
- Check user has correct role in `users` table
- Ensure auth.uid() matches user ID in policies

### OAuth Not Working
- Verify redirect URI in Supabase OAuth settings
- Check `NEXT_PUBLIC_APP_URL` environment variable
- Ensure Google OAuth credentials are configured

## Migration from Non-Authenticated to Authenticated

1. Run migration: `migrations/005_auth_and_roles.sql`
2. Update environment variables
3. Re-deploy application
4. Existing users will need to sign up or migrate accounts

## API Integration

See `API.md` for information on protecting API routes with auth checks.
