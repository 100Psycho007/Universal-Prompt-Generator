import { defaultRAGRetriever } from '../lib/rag-retriever'
import { defaultChatResponder } from '../lib/chat-responder'
import { supabase } from '../lib/supabase-client'

// Simple test script to verify RAG system functionality
async function testRAGSystem() {
  console.log('Testing RAG System...')
  
  try {
    // Test 1: Check if we have any IDEs with doc chunks
    const { data: ides, error: ideError } = await supabase
      .from('ides')
      .select('id, name')
      .eq('status', 'active')
      .limit(1)

    if (ideError || !ides || ides.length === 0) {
      console.log('❌ No active IDEs found. Please run the ingestion process first.')
      return
    }

    const testIde = ides[0]
    console.log(`✅ Found test IDE: ${testIde.name} (${testIde.id})`)

    // Test 2: Check if we have doc chunks with embeddings
    const { data: chunks, error: chunkError } = await supabase
      .from('doc_chunks')
      .select('id, text, embedding')
      .eq('ide_id', testIde.id)
      .not('embedding', 'is', null)
      .limit(1)

    if (chunkError || !chunks || chunks.length === 0) {
      console.log('❌ No doc chunks with embeddings found. Please run the embedding process first.')
      return
    }

    console.log('✅ Found doc chunks with embeddings')

    // Test 3: Test RAG retrieval
    const testQuery = 'How do I create a new project?'
    console.log(`🔍 Testing retrieval with query: "${testQuery}"`)

    const retrievalResult = await defaultRAGRetriever.retrieveAndAssemble(
      testQuery,
      testIde.id,
      { topK: 3, threshold: 0.5 }
    )

    console.log(`✅ Retrieved ${retrievalResult.chunks.length} chunks`)
    console.log(`📊 Average similarity: ${retrievalResult.metadata.averageSimilarity.toFixed(3)}`)
    console.log(`⏱️ Retrieval time: ${retrievalResult.metadata.retrievalTime}ms`)

    // Test 4: Test chat response generation
    console.log('💬 Testing chat response generation...')

    const chatResponse = await defaultChatResponder.generateResponse({
      ideId: testIde.id,
      messages: [
        { role: 'user', content: testQuery }
      ],
      context: retrievalResult.context,
      sources: retrievalResult.chunks,
      ide: retrievalResult.ide
    })

    console.log(`✅ Generated response (${chatResponse.tokensUsed.total} tokens)`)
    console.log(`📝 Response preview: ${chatResponse.response.substring(0, 100)}...`)
    console.log(`🎯 Confidence: ${chatResponse.metadata.confidence}`)
    console.log(`📚 Sources: ${chatResponse.sources.length}`)

    console.log('🎉 All tests passed! RAG system is working correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRAGSystem()
}

export { testRAGSystem }