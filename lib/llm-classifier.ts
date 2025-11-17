import type { PromptFormat, FormatDetectionResult } from './format-detector'

export interface LLMClassifierOptions {
  model?: string
  maxRetries?: number
  temperature?: number
  fetchImpl?: typeof fetch
}

const DEFAULT_MODEL = 'anthropic/claude-3-haiku'
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_TEMPERATURE = 0.1

export class LLMClassifier {
  private readonly model: string
  private readonly maxRetries: number
  private readonly temperature: number
  private readonly fetchImpl: typeof fetch
  private readonly apiKey?: string
  private readonly appUrl?: string
  private readonly appName?: string

  constructor(options?: LLMClassifierOptions) {
    this.model = options?.model ?? DEFAULT_MODEL
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
    this.temperature = options?.temperature ?? DEFAULT_TEMPERATURE
    this.fetchImpl = options?.fetchImpl ?? fetch

    this.apiKey = process.env.OPENROUTER_API_KEY
    this.appUrl = process.env.OPENROUTER_APP_URL
    this.appName = process.env.OPENROUTER_APP_NAME
  }

  public async classifyFormat(ideId: string, documentation: string): Promise<FormatDetectionResult> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const truncatedDocs = documentation.length > 8000 
      ? documentation.substring(0, 8000) + '...' 
      : documentation

    const prompt = this.buildClassificationPrompt(ideId, truncatedDocs)

    try {
      const response = await this.withRetry(() => this.callLLM(prompt))
      return this.parseLLMResponse(response)
    } catch (error) {
      console.error('LLM classification failed:', error)
      throw error
    }
  }

  private buildClassificationPrompt(ideId: string, documentation: string): string {
    return `You are an expert at analyzing IDE documentation to determine the preferred prompt format for generating prompts.

IDE ID: ${ideId}

Documentation excerpt:
"""
${documentation}
"""

Analyze this documentation and determine the most appropriate prompt format. Consider:
1. File types and extensions mentioned
2. Code examples and their languages
3. Structural patterns (headings, lists, etc.)
4. Command-line interfaces or tools
5. Schema definitions
6. Explicit format mentions

Respond with a JSON object in this exact format:
{
  "preferred_format": "json|markdown|plaintext|cli|xml|custom",
  "confidence_score": 0-100,
  "detection_methods_used": ["method1", "method2"],
  "fallback_formats": [
    {"format": "format1", "confidence": 0-100},
    {"format": "format2", "confidence": 0-100}
  ],
  "reasoning": "Brief explanation of your decision"
}

Be precise and base your decision on clear evidence from the documentation.`
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await this.fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...(this.appUrl ? { 'HTTP-Referer': this.appUrl } : {}),
        ...(this.appName ? { 'X-Title': this.appName } : {})
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorBody = await this.safeParseError(response)
      throw new Error(`LLM classification failed with status ${response.status}: ${errorBody}`)
    }

    const payload = await response.json()
    if (!payload?.choices?.[0]?.message?.content) {
      throw new Error('LLM response is malformed')
    }

    return payload.choices[0].message.content
  }

  private parseLLMResponse(response: string): FormatDetectionResult {
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate required fields
      if (!parsed.preferred_format || !parsed.confidence_score || !Array.isArray(parsed.detection_methods_used)) {
        throw new Error('LLM response missing required fields')
      }

      // Validate format
      const validFormats: PromptFormat[] = ['json', 'markdown', 'plaintext', 'cli', 'xml', 'custom']
      if (!validFormats.includes(parsed.preferred_format)) {
        throw new Error(`Invalid preferred_format: ${parsed.preferred_format}`)
      }

      // Validate confidence score
      if (typeof parsed.confidence_score !== 'number' || parsed.confidence_score < 0 || parsed.confidence_score > 100) {
        throw new Error(`Invalid confidence_score: ${parsed.confidence_score}`)
      }

      // Validate fallback formats
      if (parsed.fallback_formats && !Array.isArray(parsed.fallback_formats)) {
        throw new Error('fallback_formats must be an array')
      }

      const fallbackFormats = (parsed.fallback_formats || []).map((item: any) => {
        if (!item.format || typeof item.confidence !== 'number') {
          throw new Error('Invalid fallback format item')
        }
        if (!validFormats.includes(item.format)) {
          throw new Error(`Invalid fallback format: ${item.format}`)
        }
        return {
          format: item.format as PromptFormat,
          confidence: Math.max(0, Math.min(100, item.confidence))
        }
      })

      return {
        preferred_format: parsed.preferred_format,
        confidence_score: Math.max(0, Math.min(100, parsed.confidence_score)),
        detection_methods_used: parsed.detection_methods_used,
        fallback_formats: fallbackFormats.slice(0, 3) // Limit to top 3
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error)
      throw new Error(`LLM response parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0
    let delay = 1000 // Start with 1 second delay
    let lastError: unknown

    while (attempt < this.maxRetries) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        attempt += 1
        if (attempt >= this.maxRetries) {
          break
        }

        // Add jitter and exponential backoff
        const jitter = Math.random() * 0.2 * delay
        await new Promise(resolve => setTimeout(resolve, delay + jitter))
        delay *= 2
      }
    }

    if (lastError instanceof Error) {
      throw lastError
    }

    throw new Error('LLM classification failed after retries')
  }

  private async safeParseError(response: Response): Promise<string> {
    try {
      const data = await response.json()
      if (typeof data === 'string') {
        return data
      }
      if (data?.error) {
        if (typeof data.error === 'string') {
          return data.error
        }
        if (typeof data.error?.message === 'string') {
          return data.error.message
        }
      }
      return JSON.stringify(data)
    } catch {
      return response.statusText || 'Unknown error'
    }
  }
}

export const defaultLLMClassifier = new LLMClassifier()