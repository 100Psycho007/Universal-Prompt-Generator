# New Features Added

## 1. Profile Settings Page
- **Location**: `/profile`
- **Features**:
  - Users can update their full name
  - View email (read-only)
  - View account type (Admin/User)
  - Changes save to Supabase database
  - Success/error notifications

## 2. Incognito Mode for Chat
- **Location**: Chat page sidebar
- **Features**:
  - Toggle button to enable/disable incognito mode
  - When enabled, messages are NOT saved to chat history
  - Visual indicator showing incognito mode is active
  - Confirmation prompt when switching modes with existing messages
  - Messages are still processed normally but not persisted

## 3. Profile Navigation
- **Changes**:
  - User name in navigation is now clickable
  - Links to `/profile` page
  - Available on both homepage and chat page
  - Consistent styling across pages

## How to Use

### Change Your Name
1. Click on your name in the top navigation
2. Update the "Full Name" field
3. Click "Save Changes"

### Use Incognito Mode
1. Go to the chat page
2. In the left sidebar, click "🕶️ Incognito Mode"
3. Chat normally - your messages won't be saved
4. Click again to turn off incognito mode

## Technical Details

### Files Modified
- `app/chat/page.tsx` - Added incognito mode toggle and profile link
- `app/page.tsx` - Added profile link to navigation
- `app/api/chat/route.ts` - Added incognito mode support (skip saving to DB)

### Files Created
- `app/profile/page.tsx` - New profile settings page

### Database Changes
- No schema changes required
- Uses existing `users.profile` JSON field for storing full name
