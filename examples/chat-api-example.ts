// Example usage of the RAG Chat API
// This script demonstrates how to interact with the chat endpoint

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  metadata?: any
}

interface ChatRequest {
  ide_id: string
  messages: ChatMessage[]
  chat_id?: string
  options?: {
    top_k?: number
    threshold?: number
    max_tokens?: number
    temperature?: number
  }
}

interface ChatResponse {
  response: string
  sources: Array<{
    url: string | null
    text: string
    section: string | null
    similarity: number
  }>
  tokens_used: {
    prompt: number
    completion: number
    total: number
  }
  metadata: {
    model: string
    response_time: number
    confidence: 'high' | 'medium' | 'low'
    chat_id?: string
  }
}

class ChatClient {
  private baseUrl: string
  private authToken: string

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl
    this.authToken = authToken
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Chat API error: ${error.error || response.statusText}`)
    }

    return await response.json()
  }

  async startChat(ideId: string, message: string, options?: ChatRequest['options']): Promise<ChatResponse> {
    return this.sendMessage({
      ide_id: ideId,
      messages: [{ role: 'user', content: message }],
      options
    })
  }

  async continueChat(
    chatId: string, 
    ideId: string, 
    message: string, 
    options?: ChatRequest['options']
  ): Promise<ChatResponse> {
    return this.sendMessage({
      ide_id: ideId,
      chat_id: chatId,
      messages: [{ role: 'user', content: message }],
      options
    })
  }
}

// Example usage functions
async function exampleBasicChat() {
  console.log('=== Basic Chat Example ===')
  
  // Note: Replace with your actual auth token and API URL
  const client = new ChatClient('http://localhost:3000', 'your-supabase-jwt-token')
  
  try {
    const response = await client.startChat('vscode', 'How do I create a new extension?')
    
    console.log('Response:', response.response)
    console.log('Sources:', response.sources.length)
    console.log('Confidence:', response.metadata.confidence)
    console.log('Tokens used:', response.tokens_used.total)
    console.log('Response time:', response.metadata.response_time, 'ms')
    
    if (response.metadata.chat_id) {
      console.log('Chat ID:', response.metadata.chat_id)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function exampleMultiTurnChat() {
  console.log('\n=== Multi-turn Chat Example ===')
  
  const client = new ChatClient('http://localhost:3000', 'your-supabase-jwt-token')
  
  try {
    // First message
    const response1 = await client.startChat('vscode', 'What is VS Code?')
    console.log('Q: What is VS Code?')
    console.log('A:', response1.response.substring(0, 100) + '...')
    
    const chatId = response1.metadata.chat_id
    if (!chatId) {
      throw new Error('No chat ID returned')
    }
    
    // Follow-up message
    const response2 = await client.continueChat(
      chatId, 
      'vscode', 
      'How do I install extensions?'
    )
    
    console.log('\nQ: How do I install extensions?')
    console.log('A:', response2.response)
    console.log('Sources used:', response2.sources.map(s => s.section).join(', '))
    
  } catch (error) {
    console.error('Error:', error)
  }
}

async function exampleWithOptions() {
  console.log('\n=== Chat with Custom Options ===')
  
  const client = new ChatClient('http://localhost:3000', 'your-supabase-jwt-token')
  
  try {
    const response = await client.startChat('vscode', 'Show me debugging features', {
      top_k: 8,           // Retrieve more documents
      threshold: 0.6,      // Lower similarity threshold
      temperature: 0.3,    // More deterministic response
      max_tokens: 1500    // Shorter response
    })
    
    console.log('Response:', response.response)
    console.log('Retrieved chunks:', response.sources.length)
    console.log('Average similarity:', 
      (response.sources.reduce((sum, s) => sum + s.similarity, 0) / response.sources.length).toFixed(3)
    )
    
  } catch (error) {
    console.error('Error:', error)
  }
}

async function exampleErrorHandling() {
  console.log('\n=== Error Handling Example ===')
  
  const client = new ChatClient('http://localhost:3000', 'invalid-token')
  
  try {
    await client.startChat('vscode', 'Test message')
  } catch (error) {
    console.log('Expected error caught:', error instanceof Error ? error.message : String(error))
  }
  
  // Test with invalid IDE
  const validClient = new ChatClient('http://localhost:3000', 'your-supabase-jwt-token')
  
  try {
    await validClient.startChat('invalid-ide-id', 'Test message')
  } catch (error) {
    console.log('Expected error caught:', error instanceof Error ? error.message : String(error))
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('RAG Chat API Examples')
  console.log('======================')
  console.log('Note: Replace "your-supabase-jwt-token" with a real auth token')
  console.log('Make sure the development server is running on http://localhost:3000\n')
  
  // Uncomment to run examples
  // exampleBasicChat()
  // exampleMultiTurnChat()
  // exampleWithOptions()
  // exampleErrorHandling()
  
  console.log('\nExamples are commented out. Uncomment the function calls to run them.')
}

export { ChatClient, exampleBasicChat, exampleMultiTurnChat, exampleWithOptions, exampleErrorHandling }