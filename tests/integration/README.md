# Integration Tests

Integration tests for API routes require a running Next.js server and database connection.

## Running Integration Tests

Integration tests are best run as part of E2E tests with Playwright, which can test the full request/response cycle.

For unit testing API route logic, you can:

1. Extract business logic into separate functions in `/lib`
2. Test those functions with unit tests
3. Use E2E tests to verify the full API integration

## Example Test Structure

```typescript
// lib/health-check.ts
export async function checkHealth() {
  // Business logic here
  return { status: 'healthy', timestamp: new Date().toISOString() }
}

// app/api/health/route.ts
import { checkHealth } from '@/lib/health-check'

export async function GET() {
  const health = await checkHealth()
  return NextResponse.json(health)
}

// tests/unit/health-check.test.ts
import { checkHealth } from '@/lib/health-check'

test('should return healthy status', async () => {
  const result = await checkHealth()
  expect(result.status).toBe('healthy')
})
```

## API Route Testing

For testing API routes directly:

1. Use Playwright E2E tests to make real HTTP requests
2. Test the actual deployed routes in a staging environment
3. Use contract testing to verify API specifications

See `/tests/e2e` for full API integration tests.
