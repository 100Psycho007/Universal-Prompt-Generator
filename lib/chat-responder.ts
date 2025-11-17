import { EmbeddingService } from './embeddings'
import { ChatMessage, VectorSearchResult, IDE } from '../types/database'

export interface ChatResponderOptions {
  openRouterApiKey?: string
  openAIApiKey?: string
  openRouterModel?: string
  openAIModel?: string
  maxTokens?: number
  temperature?: number
  fetchImpl?: typeof fetch
}

export interface ChatRequest {
  ideId: string
  messages: ChatMessage[]
  context?: string
  sources?: VectorSearchResult[]
  ide?: IDE
}

export interface ChatResponse {
  response: string
  sources: Array<{
    url: string | null
    text: string
    section: string | null
    similarity: number
  }>
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  metadata: {
    model: string
    responseTime: number
    confidence: 'high' | 'medium' | 'low'
  }
}

const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_MAX_TOKENS = 2000
const DEFAULT_TEMPERATURE = 0.7

export class ChatResponder {
  private readonly openRouterApiKey?: string
  private readonly openAIApiKey?: string
  private readonly openRouterModel: string
  private readonly openAIModel: string
  private readonly maxTokens: number
  private readonly temperature: number
  private readonly fetchImpl: typeof fetch

  constructor(options: ChatResponderOptions = {}) {
    this.openRouterApiKey = options.openRouterApiKey || process.env.OPENROUTER_API_KEY
    this.openAIApiKey = options.openAIApiKey || process.env.OPENAI_API_KEY
    this.openRouterModel = options.openRouterModel || DEFAULT_OPENROUTER_MODEL
    this.openAIModel = options.openAIModel || DEFAULT_OPENAI_MODEL
    this.maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS
    this.temperature = options.temperature || DEFAULT_TEMPERATURE
    this.fetchImpl = options.fetchImpl || fetch
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now()
    
    const { ideId, messages, context, sources = [], ide } = request

    // Build system prompt with IDE-specific context
    const systemPrompt = this.buildSystemPrompt(ide, context, sources)
    
    // Prepare messages for LLM
    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // Try OpenRouter first, then fallback to OpenAI
    let response: any
    let model: string
    let provider: string

    if (this.openRouterApiKey) {
      try {
        response = await this.callOpenRouter(llmMessages)
        model = this.openRouterModel
        provider = 'openrouter'
      } catch (error) {
        console.warn('OpenRouter call failed, falling back to OpenAI:', error)
        if (!this.openAIApiKey) {
          throw new Error('Both OpenRouter and OpenAI are unavailable')
        }
        response = await this.callOpenAI(llmMessages)
        model = this.openAIModel
        provider = 'openai'
      }
    } else if (this.openAIApiKey) {
      response = await this.callOpenAI(llmMessages)
      model = this.openAIModel
      provider = 'openai'
    } else {
      throw new Error('No LLM provider configured')
    }

    const responseTime = Date.now() - startTime
    const responseText = this.extractResponseText(response, provider)
    
    // Calculate confidence based on sources and response quality
    const confidence = this.calculateConfidence(sources, responseText, context)

    // Format sources for response
    const formattedSources = sources.map(source => ({
      url: source.source_url,
      text: source.text.substring(0, 200) + (source.text.length > 200 ? '...' : ''),
      section: source.section,
      similarity: source.similarity
    }))

    // Estimate token usage (simplified)
    const promptTokens = this.estimateTokens(JSON.stringify(llmMessages))
    const completionTokens = this.estimateTokens(responseText)
    const totalTokens = promptTokens + completionTokens

    return {
      response: responseText,
      sources: formattedSources,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      },
      metadata: {
        model,
        responseTime,
        confidence
      }
    }
  }

  private buildSystemPrompt(ide?: IDE, context?: string, sources: VectorSearchResult[] = []): string {
    let prompt = `You are a helpful assistant specializing in ${ide ? ide.name : 'development tools and IDEs'}.`

    if (ide && ide.name) {
      prompt += ` You are an expert in ${ide.name} and should provide accurate, helpful information about its features, usage, and best practices.`
    }

    prompt += `

Guidelines:
- Provide clear, concise answers based on the provided documentation
- If the documentation doesn't contain the answer, say so clearly
- Use examples and code snippets when helpful
- Reference the sources you used in your answer
- Maintain a helpful, professional tone
- If you're unsure about something, acknowledge the uncertainty`

    if (context && sources.length > 0) {
      prompt += `

Below is relevant documentation from ${ide ? ide.name : 'the IDE documentation'}:

---
${context}
---

Use this documentation to answer the user's question. If the documentation doesn't contain relevant information, you can still try to help based on your general knowledge, but clearly indicate when you're going beyond the provided documentation.`
    } else {
      prompt += `

No specific documentation was found for this query. Please answer based on your general knowledge of ${ide ? ide.name : 'development tools'}, but make it clear that you're not referencing specific documentation.`
    }

    return prompt
  }

  private async callOpenRouter(messages: ChatMessage[]): Promise<any> {
    const response = await this.fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openRouterApiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_APP_URL || 'https://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'IDE Assistant'
      },
      body: JSON.stringify({
        model: this.openRouterModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: this.maxTokens,
        temperature: this.temperature
      })
    })

    if (!response.ok) {
      const errorBody = await this.safeParseError(response)
      throw new Error(`OpenRouter API failed with status ${response.status}: ${errorBody}`)
    }

    return await response.json()
  }

  private async callOpenAI(messages: ChatMessage[]): Promise<any> {
    const response = await this.fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openAIApiKey}`
      },
      body: JSON.stringify({
        model: this.openAIModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: this.maxTokens,
        temperature: this.temperature
      })
    })

    if (!response.ok) {
      const errorBody = await this.safeParseError(response)
      throw new Error(`OpenAI API failed with status ${response.status}: ${errorBody}`)
    }

    return await response.json()
  }

  private extractResponseText(response: any, provider: string): string {
    try {
      if (provider === 'openrouter') {
        return response.choices?.[0]?.message?.content || 'No response generated'
      } else if (provider === 'openai') {
        return response.choices?.[0]?.message?.content || 'No response generated'
      }
      return 'No response generated'
    } catch (error) {
      console.error('Failed to extract response text:', error)
      return 'Error processing response'
    }
  }

  private calculateConfidence(
    sources: VectorSearchResult[], 
    responseText: string, 
    context?: string
  ): 'high' | 'medium' | 'low' {
    if (sources.length === 0 || !context) {
      return 'low'
    }

    const avgSimilarity = sources.reduce((sum, source) => sum + source.similarity, 0) / sources.length
    
    // Check if response actually references the sources
    const hasSourceReferences = sources.some(source => {
      const sourceKeywords = source.text.toLowerCase().split(' ').slice(0, 5)
      return sourceKeywords.some(keyword => 
        responseText.toLowerCase().includes(keyword)
      )
    })

    if (avgSimilarity > 0.8 && hasSourceReferences) {
      return 'high'
    } else if (avgSimilarity > 0.6 && sources.length >= 2) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (rough approximation: 1 token ≈ 4 characters)
    return Math.ceil(text.length / 4)
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

  // Streaming support (placeholder for future implementation)
  async *generateResponseStream(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    // For now, just generate the full response and yield it in chunks
    const response = await this.generateResponse(request)
    const words = response.response.split(' ')
    
    for (const word of words) {
      yield word + ' '
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

export const defaultChatResponder = new ChatResponder()