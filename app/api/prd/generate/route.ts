import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface PRDSection {
  title: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
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

Format your response as a JSON array of objects with "title" and "content" fields.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0].message.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
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
