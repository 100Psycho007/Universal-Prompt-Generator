import type { NextApiRequest, NextApiResponse } from 'next'
import { PromptGenerator } from '@/lib/prompt-generator'
import type { TemplateFileInput } from '@/lib/template-renderer'
import { supabaseAdmin } from '@/lib/supabase-client'

interface GeneratePromptRequestBody {
  userId?: string
  ideId?: string
  task?: string
  language?: string
  files?: TemplateFileInput[]
  constraints?: Record<string, unknown>
  rawInput?: string
}

interface GeneratePromptResponse {
  message: string
  data: {
    ideId: string
    ideName: string
    format: string
    prompt: string
    usedFallback: boolean
    validation: {
      isValid: boolean
      errors: string[]
      warnings: string[]
    }
    attempts: Array<{
      format: string
      success: boolean
      error?: string
      validation?: {
        isValid: boolean
        errors: string[]
        warnings: string[]
      }
    }>
    durationMs: number
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeneratePromptResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const start = Date.now()
  const body = req.body as GeneratePromptRequestBody

  if (!body.userId || !body.ideId || !body.task || !body.language) {
    res.status(400).json({ error: 'userId, ideId, task, and language are required' })
    return
  }

  try {
    const generator = new PromptGenerator()
    const generationResult = await generator.generate({
      ideId: body.ideId,
      task: body.task,
      language: body.language,
      files: body.files,
      constraints: body.constraints
    })

    const rawInputPayload = typeof body.rawInput === 'string' && body.rawInput.trim().length > 0
      ? body.rawInput
      : JSON.stringify({
        task: body.task,
        language: body.language,
        files: body.files,
        constraints: body.constraints
      })

    const { error: insertError } = await supabaseAdmin
      .from('user_prompts')
      .insert({
        user_id: body.userId,
        ide_id: body.ideId,
        task_description: body.task,
        raw_input: rawInputPayload,
        generated_prompt: generationResult.prompt
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to persist generated prompt', insertError)
      res.status(500).json({ error: 'Failed to store generated prompt' })
      return
    }

    res.status(200).json({
      message: 'Prompt generated successfully',
      data: {
        ideId: generationResult.ideId,
        ideName: generationResult.ideName,
        format: generationResult.format,
        prompt: generationResult.prompt,
        usedFallback: generationResult.usedFallback,
        validation: {
          isValid: generationResult.validation.isValid,
          errors: generationResult.validation.errors,
          warnings: generationResult.validation.warnings
        },
        attempts: generationResult.attempts.map(attempt => ({
          format: attempt.format,
          success: attempt.success,
          error: attempt.error,
          validation: attempt.validation
            ? {
              isValid: attempt.validation.isValid,
              errors: attempt.validation.errors,
              warnings: attempt.validation.warnings
            }
            : undefined
        })),
        durationMs: Date.now() - start
      }
    })
  } catch (error) {
    console.error('Prompt generation failed', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
    })
  }
}
