import { createHash } from 'node:crypto'

export interface EmbeddableChunk {
  id: string
  text: string
}

export interface EmbeddingServiceOptions {
  batchSize?: number
  maxRetries?: number
  initialRetryDelayMs?: number
  openRouterModel?: string
  openAIModel?: string
  fetchImpl?: typeof fetch
}

export interface EmbeddingResult {
  id: string
  embedding: number[]
}

const DEFAULT_BATCH_SIZE = 25
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_INITIAL_DELAY = 750
const DEFAULT_OPENROUTER_MODEL = 'openai/text-embedding-3-small'
const DEFAULT_OPENAI_MODEL = 'text-embedding-3-small'

const embeddingCache = new Map<string, number[]>()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()

const hashText = (text: string) => createHash('sha256').update(text).digest('hex')

export class EmbeddingService {
  private readonly batchSize: number
  private readonly maxRetries: number
  private readonly initialRetryDelay: number
  private readonly openRouterModel: string
  private readonly openAIModel: string
  private readonly fetchImpl: typeof fetch
  private readonly openRouterApiKey?: string
  private readonly openRouterAppUrl?: string
  private readonly openRouterAppName?: string
  private readonly openAIApiKey?: string

  constructor(options?: EmbeddingServiceOptions) {
    this.batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
    this.initialRetryDelay = options?.initialRetryDelayMs ?? DEFAULT_INITIAL_DELAY
    this.openRouterModel = options?.openRouterModel ?? DEFAULT_OPENROUTER_MODEL
    this.openAIModel = options?.openAIModel ?? DEFAULT_OPENAI_MODEL
    this.fetchImpl = options?.fetchImpl ?? fetch

    this.openRouterApiKey = process.env.OPENROUTER_API_KEY
    this.openRouterAppUrl = process.env.OPENROUTER_APP_URL
    this.openRouterAppName = process.env.OPENROUTER_APP_NAME
    this.openAIApiKey = process.env.OPENAI_API_KEY
  }

  public async generateEmbeddings(chunks: EmbeddableChunk[]): Promise<EmbeddingResult[]> {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return []
    }

    const orderedResults = new Map<string, number[]>()
    const pending: Array<{ id: string; text: string; cacheKey: string }> = []

    for (const chunk of chunks) {
      const trimmedText = chunk.text.trim()
      if (!trimmedText) {
        continue
      }

      const cacheKey = hashText(normalizeText(trimmedText))
      const cached = embeddingCache.get(cacheKey)
      if (cached) {
        orderedResults.set(chunk.id, cached)
        continue
      }

      pending.push({ id: chunk.id, text: trimmedText, cacheKey })
    }

    for (let i = 0; i < pending.length; i += this.batchSize) {
      const batch = pending.slice(i, i + this.batchSize)
      const embeddings = await this.embedBatch(batch.map((item) => item.text))

      embeddings.forEach((embedding, index) => {
        const item = batch[index]
        embeddingCache.set(item.cacheKey, embedding)
        orderedResults.set(item.id, embedding)
      })
    }

    return chunks
      .filter((chunk) => orderedResults.has(chunk.id))
      .map((chunk) => ({
        id: chunk.id,
        embedding: orderedResults.get(chunk.id) ?? []
      }))
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return []
    }

    const providerErrors: Error[] = []

    if (this.openRouterApiKey) {
      try {
        return await this.withRetry(() => this.callOpenRouter(texts))
      } catch (error) {
        providerErrors.push(error instanceof Error ? error : new Error(String(error)))
        console.warn('EmbeddingService: OpenRouter embedding failed, falling back to OpenAI:', error)
      }
    }

    if (this.openAIApiKey) {
      try {
        return await this.withRetry(() => this.callOpenAI(texts))
      } catch (error) {
        providerErrors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    if (providerErrors.length > 0) {
      const message = providerErrors.map((err) => err.message).join(' | ')
      throw new Error(`Embedding generation failed: ${message}`)
    }

    throw new Error('Embedding generation failed: no provider configured')
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0
    let delay = this.initialRetryDelay
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

        const jitter = Math.random() * 0.2 * delay
        await sleep(delay + jitter)
        delay *= 2
      }
    }

    if (lastError instanceof Error) {
      throw lastError
    }

    throw new Error('Embedding request failed after retries')
  }

  private async callOpenRouter(texts: string[]): Promise<number[][]> {
    const response = await this.fetchImpl('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openRouterApiKey ?? ''}`,
        ...(this.openRouterAppUrl ? { 'HTTP-Referer': this.openRouterAppUrl } : {}),
        ...(this.openRouterAppName ? { 'X-Title': this.openRouterAppName } : {})
      },
      body: JSON.stringify({
        model: this.openRouterModel,
        input: texts
      })
    })

    if (!response.ok) {
      const errorBody = await this.safeParseError(response)
      throw new Error(
        `OpenRouter embeddings failed with status ${response.status}: ${errorBody}`
      )
    }

    const payload = await response.json()
    if (!payload?.data || !Array.isArray(payload.data)) {
      throw new Error('OpenRouter embeddings response is malformed')
    }

    return payload.data.map((item: any) => {
      if (!item?.embedding || !Array.isArray(item.embedding)) {
        throw new Error('OpenRouter embedding result missing embedding')
      }
      return item.embedding.map((value: number) => Number(value))
    })
  }

  private async callOpenAI(texts: string[]): Promise<number[][]> {
    const response = await this.fetchImpl('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openAIApiKey ?? ''}`
      },
      body: JSON.stringify({
        model: this.openAIModel,
        input: texts
      })
    })

    if (!response.ok) {
      const errorBody = await this.safeParseError(response)
      throw new Error(`OpenAI embeddings failed with status ${response.status}: ${errorBody}`)
    }

    const payload = await response.json()
    if (!payload?.data || !Array.isArray(payload.data)) {
      throw new Error('OpenAI embeddings response is malformed')
    }

    return payload.data.map((item: any) => {
      if (!item?.embedding || !Array.isArray(item.embedding)) {
        throw new Error('OpenAI embedding result missing embedding')
      }
      return item.embedding.map((value: number) => Number(value))
    })
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

export const defaultEmbeddingService = new EmbeddingService()

export const clearEmbeddingCache = () => embeddingCache.clear()
