import type { PromptFormat } from './format-detector'
import type { ManifestValidation } from './manifest-builder'

export interface PromptValidationResult {
  format: PromptFormat
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface JsonPromptShape {
  system?: unknown
  user?: unknown
  context?: unknown
}

export class PromptValidator {
  public validate(
    format: PromptFormat,
    prompt: string,
    manifestValidation?: ManifestValidation | null
  ): PromptValidationResult {
    const result: PromptValidationResult = {
      format,
      isValid: true,
      errors: [],
      warnings: []
    }

    if (!prompt || prompt.trim().length === 0) {
      result.errors.push('Prompt output is empty')
      result.isValid = false
      return result
    }

    switch (format) {
      case 'json':
        this.validateJson(prompt, result)
        break
      case 'markdown':
        this.validateMarkdown(prompt, result)
        break
      case 'plaintext':
        this.validatePlaintext(prompt, result)
        break
      case 'cli':
        this.validateCli(prompt, result)
        break
      case 'xml':
        this.validateXml(prompt, result)
        break
      default:
        this.validatePlaintext(prompt, result)
        break
    }

    if (manifestValidation && manifestValidation.rules) {
      this.applyValidationHints(result, manifestValidation, prompt)
    }

    result.isValid = result.errors.length === 0
    return result
  }

  private validateJson(prompt: string, result: PromptValidationResult): void {
    let parsed: JsonPromptShape

    try {
      parsed = JSON.parse(prompt)
    } catch (error) {
      result.errors.push(`Invalid JSON output: ${error instanceof Error ? error.message : 'unknown error'}`)
      return
    }

    if (typeof parsed.system !== 'string' || (parsed.system as string).trim().length === 0) {
      result.errors.push('JSON prompt is missing a non-empty "system" field')
    }

    if (typeof parsed.user !== 'string' || (parsed.user as string).trim().length === 0) {
      result.errors.push('JSON prompt is missing a non-empty "user" field')
    }

    if (parsed.context && typeof parsed.context !== 'object') {
      result.errors.push('JSON prompt has an invalid "context" structure')
    }
  }

  private validateMarkdown(prompt: string, result: PromptValidationResult): void {
    if (!/##\s+System/i.test(prompt)) {
      result.errors.push('Markdown prompt is missing the "## System" section')
    }

    if (!/###?\s+Task/i.test(prompt)) {
      result.errors.push('Markdown prompt is missing a task section')
    }

    if (!/##\s+User Guidance/i.test(prompt)) {
      result.warnings.push('Markdown prompt does not include a "## User Guidance" section')
    }

    if (/```/.test(prompt) === false) {
      result.warnings.push('Markdown prompt does not include any fenced code blocks for file context')
    }
  }

  private validatePlaintext(prompt: string, result: PromptValidationResult): void {
    const requiredSections = ['SYSTEM:', 'TASK:', 'LANGUAGE:', 'CONSTRAINTS:', 'FILES:']
    for (let index = 0; index < requiredSections.length; index += 1) {
      const section = requiredSections[index]
      if (prompt.indexOf(section) === -1) {
        result.errors.push(`Plaintext prompt is missing the "${section}" section`)
      }
    }
  }

  private validateCli(prompt: string, result: PromptValidationResult): void {
    const requiredFlags = ['--system', '--user', '--language']
    for (let index = 0; index < requiredFlags.length; index += 1) {
      const flag = requiredFlags[index]
      if (prompt.indexOf(flag) === -1) {
        result.errors.push(`CLI prompt is missing the "${flag}" flag`)
      }
    }

    if (!/--system\s+"[^"]+"/.test(prompt)) {
      result.warnings.push('CLI prompt system message may not be properly quoted')
    }

    if (!/--format\s+/i.test(prompt)) {
      result.warnings.push('CLI prompt does not specify an output format flag')
    }
  }

  private validateXml(prompt: string, result: PromptValidationResult): void {
    if (prompt.indexOf('<system>') === -1 || prompt.indexOf('<user>') === -1) {
      result.errors.push('XML prompt must include <system> and <user> elements')
    }

    if (!prompt.trim().startsWith('<?xml')) {
      result.warnings.push('XML prompt is missing the XML declaration header')
    }

    if (!this.isWellFormedXml(prompt)) {
      result.errors.push('XML prompt appears to have mismatched tags or invalid structure')
    }
  }

  private applyValidationHints(
    result: PromptValidationResult,
    manifestValidation: ManifestValidation,
    prompt: string
  ): void {
    const rulesCombined = manifestValidation.rules.join(' ').toLowerCase()

    if (rulesCombined.indexOf('system') !== -1 && !this.promptContainsSystem(prompt, result.format)) {
      result.warnings.push('Prompt may not explicitly include a system section as required by manifest rules')
    }
  }

  private promptContainsSystem(prompt: string, format: PromptFormat): boolean {
    switch (format) {
      case 'json':
        try {
          const parsed = JSON.parse(prompt) as JsonPromptShape
          return typeof parsed.system === 'string' && parsed.system.trim().length > 0
        } catch (_error) {
          return false
        }
      case 'markdown':
        return /##\s+System/i.test(prompt)
      case 'plaintext':
        return prompt.indexOf('SYSTEM:') !== -1
      case 'cli':
        return /--system\s+/i.test(prompt)
      case 'xml':
        return prompt.indexOf('<system>') !== -1
      default:
        return prompt.toLowerCase().indexOf('system') !== -1
    }
  }

  private isWellFormedXml(xml: string): boolean {
    const tagPattern = /<\/?([a-zA-Z0-9_:-]+)(\s[^>]*)?>/g
    const stack: string[] = []
    let match: RegExpExecArray | null

    while ((match = tagPattern.exec(xml)) !== null) {
      const tag = match[0]
      const name = match[1]

      if (tag.endsWith('/>')) {
        continue
      }

      if (tag.startsWith('</')) {
        if (stack.length === 0) {
          return false
        }
        const top = stack.pop()
        if (top !== name) {
          return false
        }
      } else {
        stack.push(name)
      }
    }

    return stack.length === 0
  }
}
