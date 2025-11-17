import type { PromptFormat } from './format-detector'

export type TemplateFileInput = string | {
  path: string
  content?: string | null
}

export interface TemplateRenderPayload {
  ideId: string
  ideName: string
  task: string
  language: string
  files?: TemplateFileInput[]
  constraints?: Record<string, unknown>
}

export interface TemplateRendererOptions {
  maxFiles?: number
  maxFilePreviewLength?: number
}

interface NormalizedFileContext {
  path: string
  preview: string | null
  truncated: boolean
}

const DEFAULT_PLACEHOLDER_SYSTEM =
  "You are a helpful assistant specialized in this IDE. Provide clear, concise responses tailored to the user's needs."

export class TemplateRenderer {
  private readonly maxFiles: number
  private readonly maxFilePreviewLength: number

  constructor(options?: TemplateRendererOptions) {
    this.maxFiles = options?.maxFiles ?? 5
    this.maxFilePreviewLength = options?.maxFilePreviewLength ?? 800
  }

  public render(format: PromptFormat, template: string, payload: TemplateRenderPayload): string {
    const normalizedFiles = this.normalizeFiles(payload.files)
    const constraintLines = this.buildConstraintLines(payload.constraints)

    switch (format) {
      case 'json':
        return this.renderJsonTemplate(template, payload, normalizedFiles, constraintLines)
      case 'markdown':
        return this.renderMarkdownTemplate(template, payload, normalizedFiles, constraintLines)
      case 'plaintext':
        return this.renderPlaintextTemplate(template, payload, normalizedFiles, constraintLines)
      case 'cli':
        return this.renderCliTemplate(template, payload, normalizedFiles, constraintLines)
      case 'xml':
        return this.renderXmlTemplate(template, payload, normalizedFiles, constraintLines)
      default:
        return this.renderPlaintextTemplate(template, payload, normalizedFiles, constraintLines)
    }
  }

  private normalizeFiles(files?: TemplateFileInput[]): NormalizedFileContext[] {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return []
    }

    const normalized: NormalizedFileContext[] = []

    for (let index = 0; index < files.length && normalized.length < this.maxFiles; index += 1) {
      const entry = files[index]

      if (typeof entry === 'string') {
        normalized.push({
          path: entry,
          preview: null,
          truncated: false
        })
        continue
      }

      const path = entry.path && entry.path.trim().length > 0
        ? entry.path.trim()
        : `file-${index + 1}`

      let preview: string | null = null
      let truncated = false

      if (typeof entry.content === 'string') {
        const trimmed = entry.content.trim()
        if (trimmed.length > 0) {
          preview = trimmed.slice(0, this.maxFilePreviewLength)
          truncated = trimmed.length > this.maxFilePreviewLength
          if (truncated) {
            preview = `${preview}…`
          }
        }
      }

      normalized.push({ path, preview, truncated })
    }

    return normalized
  }

  private buildConstraintLines(constraints?: Record<string, unknown>): string[] {
    if (!constraints || typeof constraints !== 'object') {
      return []
    }

    const lines: string[] = []
    const entries = Object.entries(constraints)
    for (let index = 0; index < entries.length; index += 1) {
      const [key, value] = entries[index]
      const formattedValue = this.stringifyConstraintValue(value)
      lines.push(`${key}: ${formattedValue}`)
    }

    return lines
  }

  private stringifyConstraintValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null'
    }

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    try {
      return JSON.stringify(value)
    } catch (_error) {
      return String(value)
    }
  }

  private renderJsonTemplate(
    template: string,
    payload: TemplateRenderPayload,
    files: NormalizedFileContext[],
    constraints: string[]
  ): string {
    let templateObject: any

    try {
      templateObject = JSON.parse(template)
    } catch (_error) {
      templateObject = {}
    }

    const baseSystem = typeof templateObject.system === 'string'
      ? templateObject.system
      : DEFAULT_PLACEHOLDER_SYSTEM

    const system = this.personalizeSystemMessage(baseSystem, payload)
    const user = this.buildUserSummary(payload, files, constraints, '\n')

    const context: Record<string, unknown> = {}
    if (templateObject && typeof templateObject.context === 'object' && !Array.isArray(templateObject.context)) {
      const contextEntries = Object.entries(templateObject.context)
      for (let index = 0; index < contextEntries.length; index += 1) {
        const [key, value] = contextEntries[index]
        if (typeof value !== 'undefined') {
          context[key] = value
        }
      }
    }

    context.language = payload.language

    if (files.length > 0) {
      context.files = files.map(item => ({
        path: item.path,
        snippet: item.preview,
        truncated: item.truncated
      }))
    }

    if (constraints.length > 0) {
      context.constraints = constraints
    }

    const finalObject = {
      ...templateObject,
      system,
      user,
      context
    }

    return JSON.stringify(finalObject, null, 2)
  }

  private renderMarkdownTemplate(
    template: string,
    payload: TemplateRenderPayload,
    files: NormalizedFileContext[],
    constraints: string[]
  ): string {
    const headingMatch = template.match(/^#\s.*$/m)
    const rootHeading = headingMatch ? headingMatch[0] : '# Prompt Template'

    const lines: string[] = []
    lines.push(rootHeading.trim())
    lines.push('')

    lines.push('## System')
    lines.push('')
    lines.push(this.personalizeSystemMessage(DEFAULT_PLACEHOLDER_SYSTEM, payload))
    lines.push('')

    lines.push('### Task Overview')
    lines.push('')
    lines.push(`- **Goal:** ${payload.task}`)
    lines.push(`- **Primary Language:** ${payload.language || 'Not specified'}`)
    lines.push('')

    if (constraints.length > 0) {
      lines.push('### Constraints')
      lines.push('')
      for (let index = 0; index < constraints.length; index += 1) {
        lines.push(`- ${constraints[index]}`)
      }
      lines.push('')
    }

    if (files.length > 0) {
      lines.push('### File Context')
      lines.push('')

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        lines.push(`- ${file.path}`)
        if (file.preview) {
          const fenceLanguage = this.detectFenceLanguage(file.path)
          lines.push('')
          lines.push('  ```' + (fenceLanguage || ''))
          lines.push(this.indentMultilineText(file.preview, '  '))
          lines.push('  ```')
        }
        lines.push('')
      }
    }

    lines.push('## User Guidance')
    lines.push('')
    lines.push('Provide a step-by-step solution addressing the task, ensuring the response is optimized for the target IDE.')

    return lines.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  private renderPlaintextTemplate(
    _template: string,
    payload: TemplateRenderPayload,
    files: NormalizedFileContext[],
    constraints: string[]
  ): string {
    const lines: string[] = []
    lines.push('SYSTEM:')
    lines.push(this.personalizeSystemMessage(DEFAULT_PLACEHOLDER_SYSTEM, payload))
    lines.push('')

    lines.push('TASK:')
    lines.push(payload.task)
    lines.push('')

    lines.push('LANGUAGE:')
    lines.push(payload.language || 'Not specified')
    lines.push('')

    lines.push('CONSTRAINTS:')
    if (constraints.length > 0) {
      for (let index = 0; index < constraints.length; index += 1) {
        lines.push(`- ${constraints[index]}`)
      }
    } else {
      lines.push('- None specified')
    }
    lines.push('')

    lines.push('FILES:')
    if (files.length > 0) {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        lines.push(`- ${file.path}`)
        if (file.preview) {
          lines.push(`  ${file.preview}`)
        }
      }
    } else {
      lines.push('- No files provided')
    }
    lines.push('')

    lines.push('RESPONSE INSTRUCTIONS:')
    lines.push('Provide a clear, IDE-ready answer tailored to the specified task and language.')

    return lines.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  private renderCliTemplate(
    template: string,
    payload: TemplateRenderPayload,
    files: NormalizedFileContext[],
    constraints: string[]
  ): string {
    const baseSystem = template.includes('--system')
      ? this.extractCliValue(template, '--system') || DEFAULT_PLACEHOLDER_SYSTEM
      : DEFAULT_PLACEHOLDER_SYSTEM

    const system = this.personalizeSystemMessage(baseSystem, payload)
    const userSection = this.buildUserSummary(payload, files, constraints, ' | ')

    const commandParts: string[] = []
    commandParts.push(`--system "${this.escapeCliValue(system)}"`)
    commandParts.push(`--user "${this.escapeCliValue(userSection)}"`)
    commandParts.push(`--language "${this.escapeCliValue(payload.language || 'Not specified')}"`)

    if (files.length > 0) {
      const fileSummaries = files.map(file => this.truncateInline(`${file.path}${file.preview ? ` -> ${file.preview}` : ''}`, 120))
      commandParts.push(`--files "${this.escapeCliValue(fileSummaries.join(' || '))}"`)
    }

    if (constraints.length > 0) {
      commandParts.push(`--constraints "${this.escapeCliValue(constraints.join(' | '))}"`)
    }

    if (!/--format\s+/i.test(template)) {
      commandParts.push('--format json')
    }

    return commandParts.join(' ')
  }

  private renderXmlTemplate(
    _template: string,
    payload: TemplateRenderPayload,
    files: NormalizedFileContext[],
    constraints: string[]
  ): string {
    const system = this.personalizeSystemMessage(DEFAULT_PLACEHOLDER_SYSTEM, payload)

    const lines: string[] = []
    lines.push('<?xml version="1.0" encoding="UTF-8"?>')
    lines.push('<prompt>')
    lines.push('  <system>')
    lines.push(`    <summary>${this.escapeXml(system)}</summary>`)
    lines.push(`    <language>${this.escapeXml(payload.language || 'Not specified')}</language>`)
    lines.push('    <ide>')
    lines.push(`      <name>${this.escapeXml(payload.ideName)}</name>`)
    lines.push(`      <identifier>${this.escapeXml(payload.ideId)}</identifier>`)
    lines.push('    </ide>')
    lines.push('  </system>')
    lines.push('  <user>')
    lines.push(`    <task>${this.escapeXml(payload.task)}</task>`)

    if (constraints.length > 0) {
      lines.push('    <constraints>')
      for (let index = 0; index < constraints.length; index += 1) {
        lines.push(`      <constraint>${this.escapeXml(constraints[index])}</constraint>`)
      }
      lines.push('    </constraints>')
    }

    if (files.length > 0) {
      lines.push('    <files>')
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        lines.push(`      <file path="${this.escapeXml(file.path)}">${file.preview ? this.escapeXml(file.preview) : ''}</file>`)
      }
      lines.push('    </files>')
    }

    lines.push('  </user>')
    lines.push('</prompt>')

    return lines.join('\n')
  }

  private buildUserSummary(
    payload: TemplateRenderPayload,
    files: NormalizedFileContext[],
    constraints: string[],
    delimiter: string
  ): string {
    const elements: string[] = []
    elements.push(`Task: ${payload.task}`)
    elements.push(`Language: ${payload.language || 'Not specified'}`)

    if (constraints.length > 0) {
      elements.push(`Constraints: ${constraints.join('; ')}`)
    }

    if (files.length > 0) {
      const summaries = files.map(file => this.truncateInline(`${file.path}${file.preview ? ` -> ${file.preview}` : ''}`, 160))
      elements.push(`Files: ${summaries.join(' | ')}`)
    }

    return elements.join(delimiter)
  }

  private personalizesReference(text: string, ideName: string): string {
    const name = ideName && ideName.trim().length > 0 ? ideName : 'the target IDE'
    let updated = text.replace(/this IDE/gi, name)

    if (updated.toLowerCase().indexOf(name.toLowerCase()) === -1) {
      updated = `${updated} Focus on ${name}.`
    }

    return updated
  }

  private personalizeSystemMessage(base: string, payload: TemplateRenderPayload): string {
    const ideAdjusted = this.personalizesReference(base, payload.ideName)
    const languageInstruction = payload.language
      ? ` Prioritize examples in ${payload.language}.`
      : ''
    const constraintInstruction = payload.constraints && Object.keys(payload.constraints).length > 0
      ? ' Ensure you adhere to all provided constraints.'
      : ''

    return `${ideAdjusted.trim()}${languageInstruction}${constraintInstruction}`.trim()
  }

  private indentMultilineText(text: string, indent: string): string {
    return text
      .split('\n')
      .map(line => `${indent}${line}`)
      .join('\n')
  }

  private detectFenceLanguage(path: string): string | null {
    const normalized = path.toLowerCase()
    if (normalized.endsWith('.ts') || normalized.endsWith('.tsx')) {
      return 'typescript'
    }
    if (normalized.endsWith('.js') || normalized.endsWith('.jsx')) {
      return 'javascript'
    }
    if (normalized.endsWith('.py')) {
      return 'python'
    }
    if (normalized.endsWith('.java')) {
      return 'java'
    }
    if (normalized.endsWith('.cs')) {
      return 'csharp'
    }
    if (normalized.endsWith('.go')) {
      return 'go'
    }
    if (normalized.endsWith('.rb')) {
      return 'ruby'
    }
    if (normalized.endsWith('.php')) {
      return 'php'
    }
    if (normalized.endsWith('.rs')) {
      return 'rust'
    }
    if (normalized.endsWith('.swift')) {
      return 'swift'
    }
    if (normalized.endsWith('.kt') || normalized.endsWith('.kts')) {
      return 'kotlin'
    }
    if (normalized.endsWith('.json')) {
      return 'json'
    }
    if (normalized.endsWith('.yml') || normalized.endsWith('.yaml')) {
      return 'yaml'
    }
    if (normalized.endsWith('.xml')) {
      return 'xml'
    }
    return null
  }

  private extractCliValue(template: string, flag: string): string | null {
    const pattern = new RegExp(`${flag}\\s+\"([^\"]*)\"`)
    const match = template.match(pattern)
    return match ? match[1] : null
  }

  private truncateInline(value: string, max: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (normalized.length <= max) {
      return normalized
    }
    return `${normalized.slice(0, max - 1)}…`
  }

  private escapeCliValue(value: string): string {
    const text = value === undefined || value === null ? '' : String(value)
    return text.replace(/\\/g, '\\\\').replace(/\"/g, '\\"').replace(/\n/g, ' ')
  }

  private escapeXml(value: string): string {
    const text = value === undefined || value === null ? '' : String(value)
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
