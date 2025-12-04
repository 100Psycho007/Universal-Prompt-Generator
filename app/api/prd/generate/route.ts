import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free'

interface PRDSection {
  title: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 503 }
      )
    }

    const { idea, context, targetAudience, constraints } = await request.json()

    if (!idea) {
      return NextResponse.json(
        { error: 'Product idea is required' },
        { status: 400 }
      )
    }

    // Build the prompt
    const prompt = `You are a product manager creating a comprehensive Product Requirements Document (PRD).

Product Idea:
${idea}

${context ? `Context:\n${context}\n` : ''}
${targetAudience ? `Target Audience:\n${targetAudience}\n` : ''}
${constraints ? `Constraints:\n${constraints}\n` : ''}

Generate a detailed PRD with the following sections:

1. Executive Summary
2. Problem Statement
3. Goals and Objectives
4. User Personas
5. User Stories
6. Functional Requirements
7. Non-Functional Requirements
8. Technical Architecture (high-level)
9. Success Metrics
10. Timeline and Milestones
11. Risks and Mitigation

For each section, provide detailed, actionable content. Be specific and practical.

Format your response as a JSON object with a "sections" array containing objects with "title" and "content" fields.`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Universal IDE Database'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert product manager who creates comprehensive, actionable PRDs. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API failed: ${response.status} ${errorText}`)
    }

    const completion = await response.json()
    const responseText = completion.choices?.[0]?.message?.content
    
    if (!responseText) {
      throw new Error('No response from OpenRouter')
    }

    // Parse the response
    const parsed = JSON.parse(responseText)
    const sections: PRDSection[] = parsed.sections || []

    return NextResponse.json({
      message: 'PRD generated successfully',
      data: {
        sections
      }
    })
  } catch (error: any) {
    console.error('PRD generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PRD' },
      { status: 500 }
    )
  }
}
