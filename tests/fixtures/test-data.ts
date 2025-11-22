import type { DocChunk } from '@/types/database'
import type { PromptFormat } from '@/lib/format-detector'

export const MOCK_IDE_ID = 'test-ide-001'
export const MOCK_IDE_NAME = 'Test IDE'
export const MOCK_USER_ID = 'user-123'

export const MOCK_DOC_CHUNKS: DocChunk[] = [
  {
    id: 'chunk-1',
    ide_id: MOCK_IDE_ID,
    text: 'Introduction to Test IDE. This is a powerful development environment.',
    source_url: 'https://example.com/docs/intro',
    section: 'Introduction',
    version: 'latest',
    embedding: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'chunk-2',
    ide_id: MOCK_IDE_ID,
    text: 'Configuration: Use JSON files to configure your IDE settings.',
    source_url: 'https://example.com/docs/config',
    section: 'Configuration',
    version: 'latest',
    embedding: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'chunk-3',
    ide_id: MOCK_IDE_ID,
    text: 'Advanced features include debugging, refactoring, and code analysis.',
    source_url: 'https://example.com/docs/advanced',
    section: 'Advanced Features',
    version: 'latest',
    embedding: null,
    created_at: new Date().toISOString(),
  },
]

export const MOCK_SEARCH_RESULTS = [
  {
    chunk: MOCK_DOC_CHUNKS[0],
    similarity: 0.95,
  },
  {
    chunk: MOCK_DOC_CHUNKS[1],
    similarity: 0.87,
  },
  {
    chunk: MOCK_DOC_CHUNKS[2],
    similarity: 0.82,
  },
]

export const TEMPLATE_PAYLOADS = {
  basic: {
    ideId: MOCK_IDE_ID,
    ideName: MOCK_IDE_NAME,
    task: 'Write a function to parse JSON',
    language: 'TypeScript',
  },
  withFiles: {
    ideId: MOCK_IDE_ID,
    ideName: MOCK_IDE_NAME,
    task: 'Refactor this code',
    language: 'JavaScript',
    files: [
      { path: 'src/index.js', content: 'console.log("Hello World");' },
      { path: 'src/utils.js', content: 'export const add = (a, b) => a + b;' },
    ],
  },
  withConstraints: {
    ideId: MOCK_IDE_ID,
    ideName: MOCK_IDE_NAME,
    task: 'Create a REST API',
    language: 'Python',
    constraints: {
      framework: 'FastAPI',
      authentication: 'JWT',
      maxLines: 100,
    },
  },
  edgeCases: {
    ideId: MOCK_IDE_ID,
    ideName: MOCK_IDE_NAME,
    task: 'Handle special characters: " \' \\ \n \t',
    language: 'C++',
    files: [
      {
        path: 'file with spaces.cpp',
        content: 'Very long content '.repeat(100),
      },
    ],
  },
}

export const VALIDATION_TEST_PROMPTS: Record<PromptFormat, { valid: string; invalid: string }> = {
  json: {
    valid: JSON.stringify({
      system: 'You are a helpful assistant',
      user: 'Help me with this task',
      context: { language: 'TypeScript' },
    }),
    invalid: '{ "system": "Missing user field" }',
  },
  markdown: {
    valid: `# Prompt
## System
You are a helpful assistant
### Task Overview
- Goal: Complete task
## User Guidance
Follow these steps`,
    invalid: `Just some text without proper sections`,
  },
  plaintext: {
    valid: `SYSTEM:
You are a helpful assistant
TASK:
Complete this task
LANGUAGE:
TypeScript
CONSTRAINTS:
- None
FILES:
- None`,
    invalid: `Missing required sections`,
  },
  cli: {
    valid: `--system "You are a helpful assistant" --user "Help me" --language "TypeScript"`,
    invalid: `missing flags`,
  },
  xml: {
    valid: `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <system>You are a helpful assistant</system>
  <user>Help me with this</user>
</prompt>`,
    invalid: `<prompt><system>Unclosed tag`,
  },
  custom: {
    valid: `Custom format with system and user sections`,
    invalid: ``,
  },
}

export const CHAT_MESSAGES = [
  {
    role: 'user' as const,
    content: 'How do I configure the IDE?',
    timestamp: new Date().toISOString(),
  },
  {
    role: 'assistant' as const,
    content: 'You can configure the IDE using JSON files in the config directory.',
    timestamp: new Date().toISOString(),
    metadata: {
      model: 'gpt-4',
      tokensUsed: { prompt: 20, completion: 15, total: 35 },
      confidence: 'high' as const,
      sources: [
        {
          url: 'https://example.com/docs/config',
          text: 'Configuration documentation',
          section: 'Configuration',
          similarity: 0.92,
        },
      ],
    },
  },
  {
    role: 'user' as const,
    content: 'Can you show me an example?',
    timestamp: new Date().toISOString(),
  },
]
