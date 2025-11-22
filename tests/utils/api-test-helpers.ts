import { NextRequest } from 'next/server'

export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const {
    method = 'GET',
    headers = {},
    body,
    searchParams = {},
  } = options

  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(urlObj.toString(), requestInit as RequestInit)
}

export async function extractResponseData(response: Response) {
  const text = await response.text()
  
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function expectSuccessResponse(response: Response) {
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
}

export function expectErrorResponse(response: Response, expectedStatus?: number) {
  if (expectedStatus) {
    expect(response.status).toBe(expectedStatus)
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400)
  }
}

export function createAuthHeaders(userId: string = 'test-user-123'): Record<string, string> {
  return {
    'x-user-id': userId,
  }
}

export function createCronHeaders(secret: string = 'test-cron-secret'): Record<string, string> {
  return {
    Authorization: `Bearer ${secret}`,
  }
}

export const MOCK_SUPABASE_RESPONSES = {
  ides: {
    data: [
      {
        id: 'vscode',
        name: 'Visual Studio Code',
        manifest: {
          preferred_format: 'json',
          templates: {
            json: '{"system": "You are helpful", "user": "Help me"}',
          },
        },
      },
      {
        id: 'intellij',
        name: 'IntelliJ IDEA',
        manifest: {
          preferred_format: 'markdown',
          templates: {
            markdown: '# Template\n## System\nYou are helpful',
          },
        },
      },
    ],
    error: null,
  },
  docChunks: {
    data: [
      {
        id: 'chunk-1',
        ide_id: 'vscode',
        text: 'VS Code is a powerful editor',
        source_url: 'https://code.visualstudio.com/docs',
        section: 'Introduction',
        version: 'latest',
        embedding: new Array(1536).fill(0.1),
      },
    ],
    error: null,
  },
  chatHistory: {
    data: [
      {
        id: 'conversation-1',
        user_id: 'test-user-123',
        ide_id: 'vscode',
        messages: [
          {
            role: 'user',
            content: 'How do I debug?',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
    error: null,
  },
}
