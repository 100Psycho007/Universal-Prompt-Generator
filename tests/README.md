# Testing Suite Documentation

This directory contains comprehensive tests for the Universal IDE Database platform.

## Structure

```
tests/
├── unit/                  # Unit tests for individual modules
│   ├── format-detector.test.ts
│   ├── chunker.test.ts
│   ├── template-renderer.test.ts
│   ├── prompt-validator.test.ts
│   └── manifest-builder.test.ts
├── integration/          # Integration tests for API routes
│   ├── health.test.ts
│   ├── prompt-generation.test.ts
│   └── chat.test.ts
├── e2e/                  # End-to-end tests with Playwright
│   ├── auth-flow.spec.ts
│   ├── prompt-generation.spec.ts
│   └── chat.spec.ts
├── fixtures/             # Test data and mocks
│   ├── sample-docs.ts
│   └── test-data.ts
└── utils/                # Test utilities
    └── api-test-helpers.ts
```

## Running Tests

### All Tests
```bash
npm test                  # Run all Jest tests
npm run test:all          # Run unit, integration, and E2E tests
```

### Unit Tests
```bash
npm run test:unit         # Run all unit tests
npm run test:unit -- format-detector  # Run specific test file
npm run test:watch        # Watch mode for development
```

### Integration Tests
```bash
npm run test:integration  # Run all integration tests
```

### E2E Tests
```bash
npm run test:e2e          # Run E2E tests (headless)
npm run test:e2e:headed   # Run with browser visible
npm run test:e2e:ui       # Run with Playwright UI
npx playwright test --project=chromium  # Run in specific browser
```

### Coverage
```bash
npm run test:coverage     # Generate coverage report
```

## Test Coverage Goals

We maintain ≥80% coverage for critical paths:

### Covered Modules (Unit Tests)

1. **format-detector.ts** - 85%+ coverage
   - ✅ File extension detection (JSON, Markdown, XML, CLI)
   - ✅ Code fence analysis
   - ✅ JSON schema detection
   - ✅ Markdown structure analysis (headings, bullets, links)
   - ✅ CLI pattern detection (commands, flags)
   - ✅ Keyword detection
   - ✅ Score aggregation
   - ✅ LLM fallback integration
   - ✅ Edge cases (empty docs, mixed signals)

2. **chunker.ts** - 85%+ coverage
   - ✅ Token counting with tiktoken
   - ✅ Overlap logic
   - ✅ Section splitting by markdown headings
   - ✅ Max/min token enforcement
   - ✅ Chunk metadata (indices, versions)
   - ✅ Fallback character-based chunking
   - ✅ Edge cases (empty, single line, unicode)

3. **template-renderer.ts** - 80%+ coverage
   - ✅ JSON template rendering
   - ✅ Markdown template rendering
   - ✅ Plaintext template rendering
   - ✅ CLI template rendering
   - ✅ XML template rendering
   - ✅ Variable substitution
   - ✅ File context handling
   - ✅ Constraint handling
   - ✅ Special character escaping
   - ✅ Edge cases (long filenames, empty content)

4. **prompt-validator.ts** - 80%+ coverage
   - ✅ JSON validation (structure, required fields)
   - ✅ Markdown validation (sections, code blocks)
   - ✅ Plaintext validation (required sections)
   - ✅ CLI validation (flags, quoting)
   - ✅ XML validation (well-formedness, tags)
   - ✅ Manifest rule integration
   - ✅ Edge cases (empty prompts, unicode)

5. **manifest-builder.ts** - 80%+ coverage
   - ✅ Manifest generation with all required fields
   - ✅ Template generation for all formats
   - ✅ Validation rule generation
   - ✅ Source URL extraction
   - ✅ Format-specific handling
   - ✅ Edge cases (empty chunks, no fallbacks)

### Integration Tests

- ✅ `/api/health` - Health check endpoint
- ✅ `/api/prompt/generate` - Prompt generation for all formats
- ✅ `/api/chat` - Chat conversations with context
- ✅ `/api/chat/history` - Chat history retrieval

### E2E Tests

- ✅ Authentication flow (signup, login, password reset)
- ✅ Guest mode browsing
- ✅ IDE selection and prompt generation
- ✅ Multi-turn chat conversations
- ✅ Citation display
- ✅ Copy to clipboard
- ✅ Mobile responsiveness
- ✅ Keyboard shortcuts

## Performance Benchmarks

All tests verify that critical operations meet performance targets:

- ✅ Prompt generation: < 2 seconds
- ✅ Chat response: < 5 seconds
- ✅ Doc ingestion: < 60 seconds per IDE
- ✅ Load test: 50 concurrent users

## Writing Tests

### Unit Test Example

```typescript
import { FormatDetector } from '@/lib/format-detector'

describe('FormatDetector', () => {
  let detector: FormatDetector

  beforeEach(() => {
    detector = new FormatDetector()
  })

  it('should detect JSON format', async () => {
    const doc = 'Use settings.json for configuration'
    const result = await detector.detectFormat('test-ide', doc)
    
    expect(result.preferred_format).toBe('json')
    expect(result.confidence_score).toBeGreaterThan(60)
  })
})
```

### Integration Test Example

```typescript
import { GET } from '@/app/api/health/route'
import { createMockRequest } from '../utils/api-test-helpers'

describe('/api/health', () => {
  it('should return healthy status', async () => {
    const request = createMockRequest('/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should generate prompt', async ({ page }) => {
  await page.goto('/')
  
  await page.fill('textarea[name="task"]', 'Create a REST API')
  await page.click('button:has-text("Generate")')
  
  await expect(page.locator('.prompt-output')).toBeVisible()
})
```

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions:

1. **Unit Tests** - Fast feedback on core logic
2. **Integration Tests** - API route functionality
3. **E2E Tests** - Full user flow validation
4. **Type Check** - TypeScript compilation
5. **Lint** - Code style validation
6. **Coverage Report** - Ensure coverage thresholds

See `.github/workflows/test.yml` for CI configuration.

## Debugging Tests

### Jest Tests
```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test
npm test -- format-detector.test.ts

# Update snapshots
npm test -- -u
```

### Playwright Tests
```bash
# Debug mode with browser
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Specific test file
npx playwright test auth-flow.spec.ts

# Generate trace for failed tests
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## Best Practices

1. **Isolation** - Each test should be independent
2. **Descriptive Names** - Use clear test descriptions
3. **Arrange-Act-Assert** - Follow AAA pattern
4. **Mock External Dependencies** - Use mocks for Supabase, OpenAI
5. **Test Edge Cases** - Empty inputs, unicode, long strings
6. **Performance** - Keep tests fast (< 1s for unit tests)
7. **Coverage** - Aim for 80%+ on critical paths
8. **Cleanup** - Reset state after each test

## Troubleshooting

### Common Issues

**Jest can't find modules**
```bash
# Clear cache
npm test -- --clearCache

# Check jest.config.js moduleNameMapper
```

**Playwright tests timing out**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000

# Check if dev server is running
npm run dev
```

**Coverage threshold not met**
```bash
# Run with coverage to see gaps
npm run test:coverage

# Check coverage/lcov-report/index.html
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain coverage thresholds
4. Update test documentation
5. Add E2E tests for user-facing features

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)
