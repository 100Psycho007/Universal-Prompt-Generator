import { supabaseAdmin } from '@/lib/supabase-client'

const requireSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized')
  }
  return supabaseAdmin
}
import type { PromptFormat } from './format-detector'
import type { IDEManifest } from './manifest-builder'
import { TemplateRenderer, type TemplateFileInput, type TemplateRenderPayload } from './template-renderer'
import { PromptValidator, type PromptValidationResult } from './prompt-validator'

export interface PromptGenerationRequest {
  ideId: string
  task: string
  language: string
  files?: TemplateFileInput[]
  constraints?: Record<string, unknown>
}

export interface GenerationAttempt {
  format: PromptFormat
  success: boolean
  error?: string
  validation?: PromptValidationResult
}

export interface PromptGenerationResult {
  ideId: string
  ideName: string
  format: PromptFormat
  prompt: string
  usedFallback: boolean
  validation: PromptValidationResult
  attempts: GenerationAttempt[]
}

interface IDERecord {
  id: string
  name: string
  manifest: IDEManifest | null
}

export class PromptGenerator {
  private readonly templateRenderer: TemplateRenderer
  private readonly promptValidator: PromptValidator

  constructor(templateRenderer?: TemplateRenderer, promptValidator?: PromptValidator) {
    this.templateRenderer = templateRenderer ?? new TemplateRenderer()
    this.promptValidator = promptValidator ?? new PromptValidator()
  }

  public async generate(request: PromptGenerationRequest): Promise<PromptGenerationResult> {
    const ideRecord = await this.loadIdeManifest(request.ideId)
    if (!ideRecord.manifest) {
      throw new Error('IDE manifest is missing or has not been generated')
    }

    const manifest = this.normalizeManifest(ideRecord)
    const formatsToTry = this.buildFormatPreferenceList(manifest)
    const attempts: GenerationAttempt[] = []

    for (let index = 0; index < formatsToTry.length; index += 1) {
      const format = formatsToTry[index]
      const template = manifest.templates ? manifest.templates[format] : undefined

      if (!template || template.trim().length === 0) {
        const warningMessage = `Template for format "${format}" is unavailable`
        attempts.push({
          format,
          success: false,
          error: warningMessage
        })
        console.warn('[PromptGenerator] Template missing', {
          ideId: manifest.id,
          format,
          message: warningMessage
        })
        continue
      }

      try {
        const payload: TemplateRenderPayload = {
          ideId: manifest.id,
          ideName: manifest.name,
          task: request.task,
          language: request.language,
          files: request.files,
          constraints: request.constraints
        }

        const promptOutput = this.templateRenderer.render(format, template, payload)
        const validation = this.promptValidator.validate(format, promptOutput, manifest.validation)

        const attempt: GenerationAttempt = {
          format,
          validation,
          success: validation.isValid
        }
        attempts.push(attempt)

        if (validation.isValid) {
          const usedFallback = format !== manifest.preferred_format
          console.info('[PromptGenerator] Successfully generated prompt', {
            ideId: manifest.id,
            format,
            usedFallback,
            attempts: attempts.length
          })

          return {
            ideId: manifest.id,
            ideName: manifest.name,
            format,
            prompt: promptOutput,
            usedFallback,
            validation,
            attempts
          }
        }

        console.warn('[PromptGenerator] Validation failed for generated prompt', {
          ideId: manifest.id,
          format,
          errors: validation.errors
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unexpected error during template rendering'
        attempts.push({
          format,
          success: false,
          error: errorMessage
        })

        console.error('[PromptGenerator] Error generating prompt', {
          ideId: manifest.id,
          format,
          error: errorMessage
        })
      }
    }

    throw new Error(`Failed to generate a valid prompt for IDE ${manifest.id}`)
  }

  private async loadIdeManifest(ideId: string): Promise<IDERecord> {
    const admin = requireSupabaseAdmin()
    const { data, error } = await admin
      .from('ides')
      .select('id, name, manifest')
      .eq('id', ideId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('IDE not found')
    }

    const manifest = (data.manifest ?? null) as IDEManifest | null

    return {
      id: data.id,
      name: data.name,
      manifest
    }
  }

  private normalizeManifest(record: IDERecord): IDEManifest {
    if (!record.manifest) {
      throw new Error('Manifest not available for IDE')
    }

    const merged: IDEManifest = {
      ...record.manifest,
      id: record.manifest.id || record.id,
      name: record.manifest.name || record.name,
      preferred_format: record.manifest.preferred_format,
      fallback_formats: record.manifest.fallback_formats || [],
      validation: record.manifest.validation,
      templates: record.manifest.templates,
      doc_version: record.manifest.doc_version,
      doc_sources: record.manifest.doc_sources,
      trusted: record.manifest.trusted,
      last_updated: record.manifest.last_updated
    }

    return merged
  }

  private buildFormatPreferenceList(manifest: IDEManifest): PromptFormat[] {
    const ordered: PromptFormat[] = []

    if (manifest.preferred_format && ordered.indexOf(manifest.preferred_format) === -1) {
      ordered.push(manifest.preferred_format)
    }

    if (Array.isArray(manifest.fallback_formats)) {
      for (let index = 0; index < manifest.fallback_formats.length; index += 1) {
        const fallback = manifest.fallback_formats[index]
        if (ordered.indexOf(fallback) === -1) {
          ordered.push(fallback)
        }
      }
    }

    if (manifest.templates) {
      const templateFormats = Object.keys(manifest.templates) as PromptFormat[]
      for (let index = 0; index < templateFormats.length; index += 1) {
        const key = templateFormats[index]
        if (ordered.indexOf(key) === -1) {
          ordered.push(key)
        }
      }
    }

    return ordered
  }
}
