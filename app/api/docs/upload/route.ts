import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabase } from '@/lib/supabase-client'
import { EmbeddingService } from '@/lib/embeddings'
import { chunkDocument } from '@/lib/chunker'
import { parseDocument } from '@/lib/parser'
import { crawlDocumentation } from '@/lib/crawler'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase!.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const method = formData.get('method') as string

    if (!name) {
      return NextResponse.json(
        { error: 'Documentation name is required' },
        { status: 400 }
      )
    }

    let content = ''
    let sourceUrl = ''

    // Handle different upload methods
    if (method === 'file') {
      const files = formData.getAll('files') as File[]
      if (files.length === 0) {
        return NextResponse.json(
          { error: 'No files provided' },
          { status: 400 }
        )
      }

      // Parse all files and combine content
      const parsedContents = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer()
          return parseDocument(Buffer.from(buffer), file.name)
        })
      )
      content = parsedContents.join('\n\n')
      sourceUrl = `uploaded-files: ${files.map(f => f.name).join(', ')}`
    } else if (method === 'url') {
      const url = formData.get('url') as string
      if (!url) {
        return NextResponse.json(
          { error: 'URL is required' },
          { status: 400 }
        )
      }

      // For now, return an error - full crawling will be implemented later
      return NextResponse.json(
        { error: 'URL crawling is not yet implemented. Please use file upload or paste content.' },
        { status: 501 }
      )
    } else if (method === 'paste') {
      content = formData.get('content') as string
      if (!content) {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        )
      }
      sourceUrl = 'pasted-content'
    }

    // Create IDE entry (custom doc)
    const { data: ide, error: ideError } = await supabaseAdmin!
      .from('ides')
      .insert({
        name,
        docs_url: sourceUrl,
        status: 'ingesting',
        is_custom: true,
        uploaded_by: user.id,
        manifest: {
          preferred_formats: ['markdown', 'json'],
          fallback_formats: ['plaintext']
        }
      })
      .select()
      .single()

    if (ideError) {
      console.error('Error creating IDE:', ideError)
      return NextResponse.json(
        { error: 'Failed to create documentation entry' },
        { status: 500 }
      )
    }

    // Chunk the content
    const chunks = chunkDocument({
      ideId: ide.id,
      text: content,
      sourceUrl,
      version: 'latest'
    }, {
      maxTokens: 1000,
      overlapTokens: 200
    })

    // Generate embeddings
    const embeddingService = new EmbeddingService({ userId: user.id })
    const embeddingResults = await embeddingService.generateEmbeddings(
      chunks.map(chunk => ({ id: chunk.ide_id, text: chunk.text }))
    )

    // Prepare chunk inserts with embeddings
    const chunkInserts = chunks.map((chunk, index) => {
      const embeddingResult = embeddingResults.find(e => e.id === chunk.ide_id)
      return {
        ide_id: chunk.ide_id,
        text: chunk.text,
        embedding: embeddingResult?.embedding || null,
        source_url: chunk.source_url,
        section: chunk.section,
        version: chunk.version
      }
    })

    const { error: chunksError } = await supabaseAdmin!
      .from('doc_chunks')
      .insert(chunkInserts)

    if (chunksError) {
      console.error('Error inserting chunks:', chunksError)
      // Update IDE status to error
      await supabaseAdmin!
        .from('ides')
        .update({ status: 'error' })
        .eq('id', ide.id)

      return NextResponse.json(
        { error: 'Failed to process documentation chunks' },
        { status: 500 }
      )
    }

    // Update IDE status to active
    await supabaseAdmin!
      .from('ides')
      .update({
        status: 'active',
        doc_count: chunks.length,
        last_ingested_at: new Date().toISOString()
      })
      .eq('id', ide.id)

    return NextResponse.json({
      message: 'Documentation uploaded successfully',
      data: {
        ideId: ide.id,
        name: ide.name,
        chunkCount: chunks.length
      }
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
