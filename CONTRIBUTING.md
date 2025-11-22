# Contributing to Universal IDE Platform

Thank you for your interest in contributing! This guide will help you get started with development.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards others

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: Latest version
- **Supabase Account**: For database access
- **API Keys**: OpenAI and/or OpenRouter (for embeddings and chat)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/universal-ide-platform.git
cd universal-ide-platform
```

3. Add upstream remote:
```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/universal-ide-platform.git
```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret (for local testing)
CRON_SECRET=local-dev-secret
```

### 3. Database Setup

Start local Supabase (or use your cloud instance):
```bash
npx supabase start
```

Apply migrations:
```bash
npm run db:migrate
```

Seed initial data:
```bash
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types - use `unknown` if type is truly unknown
- Define interfaces for all data structures
- Use proper type annotations for function parameters and returns

**Example**:
```typescript
// Good
interface UserProfile {
  id: string
  name: string
  email: string
}

async function getUserProfile(userId: string): Promise<UserProfile> {
  // implementation
}

// Bad
async function getUserProfile(userId: any) {
  // implementation
}
```

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserData`, `isLoading`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `ChatMessage`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Files**: kebab-case (`user-profile.tsx`, `auth-context.tsx`)
- **Components**: PascalCase (`UserProfile.tsx`, `ChatMessage.tsx`)

### File Structure

```
/app                  # Next.js App Router pages
  /api               # API routes
  /auth              # Auth pages
  /chat              # Chat interface
  /admin             # Admin dashboard
/components          # React components
/lib                 # Shared utilities
/types               # TypeScript types
/tests               # Test files
  /unit             # Unit tests
  /integration      # Integration tests
  /e2e              # End-to-end tests
/docs                # Documentation
/migrations          # Database migrations
```

### React/Next.js

- Use functional components with hooks
- Use Next.js App Router (not Pages Router)
- Implement proper error boundaries
- Use `async/await` for Server Components
- Use `'use client'` directive only when necessary

**Example**:
```typescript
// Server Component (default)
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id)
  return <div>{user.name}</div>
}

// Client Component
'use client'
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### Error Handling

Always use the standardized error handling utilities:

```typescript
import { Logger } from '@/lib/logger'
import { ErrorHandler, ERROR_CODES } from '@/lib/error-handler'
import { withExponentialBackoff } from '@/lib/retry-utils'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Use retry logic for external services
    const result = await withExponentialBackoff(async () => {
      return await externalServiceCall()
    })
    
    // Log successful calls
    await Logger.logAPICall({
      userId,
      endpoint: '/api/endpoint',
      method: 'POST',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime
    })
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const { statusCode, userMessage } = ErrorHandler.logError(error)
    return NextResponse.json(
      { error: { message: userMessage } },
      { status: statusCode }
    )
  }
}
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Type checking
npm run type-check
```

**Key Style Rules**:
- Use 2 spaces for indentation
- Use single quotes for strings
- No semicolons (enforced by ESLint)
- Trailing commas in multi-line objects/arrays
- Max line length: 100 characters

### Comments

- Write self-documenting code when possible
- Add comments for complex logic or non-obvious decisions
- Use JSDoc for public functions/APIs
- Avoid obvious comments

**Example**:
```typescript
// Good
/**
 * Calculates similarity score between query and document using cosine similarity
 * @param queryEmbedding - Vector representation of search query
 * @param docEmbedding - Vector representation of document
 * @returns Similarity score between 0 and 1
 */
function calculateSimilarity(queryEmbedding: number[], docEmbedding: number[]): number {
  // implementation
}

// Bad - obvious comment
// This function adds two numbers
function add(a: number, b: number): number {
  return a + b
}
```

## Testing

### Running Tests

```bash
# All tests
npm run test:all

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode (TDD)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

**Unit Tests** (`tests/unit/`):
```typescript
import { formatDetector } from '@/lib/format-detector'

describe('formatDetector', () => {
  describe('detectFormat', () => {
    it('should detect JSON format from content', () => {
      const content = '{ "name": "test" }'
      const format = formatDetector.detectFormat(content, 'test.json')
      expect(format).toBe('json')
    })
  })
})
```

**E2E Tests** (`tests/e2e/`):
```typescript
import { test, expect } from '@playwright/test'

test('user can generate prompt', async ({ page }) => {
  await page.goto('/')
  await page.fill('[data-testid="task-input"]', 'Create a React component')
  await page.click('[data-testid="generate-button"]')
  await expect(page.locator('[data-testid="prompt-output"]')).toBeVisible()
})
```

### Test Coverage Requirements

- Unit test coverage: **80%+** on critical modules
- All new features must include tests
- All bug fixes must include regression tests

## Pull Request Process

### 1. Create a Feature Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Your Changes

- Write clean, maintainable code
- Follow code standards
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Your Changes

Follow conventional commit format:

```bash
git commit -m "feat: add user profile editing"
git commit -m "fix: resolve chat message ordering issue"
git commit -m "docs: update API documentation"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/updates
- `chore`: Maintenance tasks

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create a pull request on GitHub with:

**Title**: Clear, descriptive title following conventional commits

**Description**:
```markdown
## Description
Brief description of changes

## Related Issues
Closes #123

## Changes Made
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors
- [ ] Commits follow conventional format
```

### 5. Code Review Process

- All PRs require at least 1 approval
- Address reviewer feedback promptly
- Keep PRs focused and reasonably sized
- CI/CD checks must pass before merge

### 6. After Merge

```bash
# Update your local main
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

## Project Structure

### Key Directories

```
/app
  /api              # API routes (Next.js Route Handlers)
    /chat          # Chat endpoints
    /prompt        # Prompt generation
    /cron          # Cron job endpoints
    /auth          # Auth callbacks
  /auth            # Auth pages (signup, login, etc.)
  /chat            # Chat interface
  /admin           # Admin dashboard
  page.tsx         # Home page
  layout.tsx       # Root layout

/components        # Reusable React components
  ChatMessage.tsx
  CitationLinks.tsx
  ManifestViewer.tsx

/lib               # Shared utilities and core logic
  supabase-client.ts      # Supabase client setup
  auth-context.tsx        # Auth context provider
  logger.ts               # Logging utilities
  error-handler.ts        # Error handling
  retry-utils.ts          # Retry logic
  crawler.ts              # Documentation crawler
  chunker.ts              # Text chunking
  embeddings.ts           # Embedding generation
  format-detector.ts      # Format detection
  rag-retriever.ts        # RAG retrieval
  chat-responder.ts       # Chat LLM integration

/types             # TypeScript type definitions
  database.ts      # Database types
  supabase.ts      # Supabase types

/migrations        # Database migrations (sequential)
  001_initial_schema.sql
  002_rls_policies.sql
  ...

/tests             # Test files
  /unit           # Unit tests
  /integration    # Integration tests
  /e2e            # E2E tests
  /fixtures       # Test data
```

## Common Tasks

### Adding a New API Endpoint

1. Create route file: `/app/api/your-endpoint/route.ts`
2. Implement handler with proper error handling
3. Add tests in `/tests/integration/`
4. Document in `API.md`

### Adding a New Database Table

1. Create migration: `/migrations/00X_description.sql`
2. Update types: `npm run db:generate-types`
3. Update RLS policies if needed
4. Add helper functions in `/lib/supabase-client.ts`

### Adding a New React Component

1. Create component: `/components/YourComponent.tsx`
2. Add TypeScript interfaces
3. Write component tests
4. Add Storybook story (if applicable)

### Debugging

**Server-side**:
```typescript
import { Logger } from '@/lib/logger'

Logger.debug({ action: 'DEBUG', message: 'Debug info', data })
```

**Client-side**:
```typescript
console.log('Debug info:', data)
```

**Database queries**:
```typescript
const { data, error } = await supabase.from('table').select('*')
console.log('Query result:', data, error)
```

### Environment-Specific Code

```typescript
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}

if (process.env.NODE_ENV === 'production') {
  // Production-only code
}
```

## Getting Help

- **Documentation**: Check `/docs` directory
- **Discussions**: GitHub Discussions
- **Issues**: Create a GitHub Issue
- **Chat**: Join our Discord (link)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎉
