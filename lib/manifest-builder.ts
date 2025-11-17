import type { PromptFormat, FormatDetectionResult } from './format-detector'
import type { DocChunk } from '../types/database'

export interface PromptTemplate {
  [key: string]: string
}

export interface ManifestValidation {
  type: string
  rules: string[]
}

export interface IDEManifest {
  id: string
  name: string
  preferred_format: PromptFormat
  fallback_formats: PromptFormat[]
  validation: ManifestValidation
  templates: PromptTemplate
  doc_version: string
  doc_sources: string[]
  trusted: boolean
  last_updated: string
}

export interface ManifestBuilderOptions {
  includeAllFormats?: boolean
  validateTemplates?: boolean
}

export class ManifestBuilder {
  private options: Required<ManifestBuilderOptions>

  constructor(options?: ManifestBuilderOptions) {
    this.options = {
      includeAllFormats: options?.includeAllFormats ?? true,
      validateTemplates: options?.validateTemplates ?? true
    }
  }

  public buildManifest(
    ideId: string,
    ideName: string,
    formatDetection: FormatDetectionResult,
    docChunks: DocChunk[],
    version: string = 'latest'
  ): IDEManifest {
    const templates = this.generateTemplates(
      formatDetection.preferred_format,
      docChunks
    )

    if (this.options.validateTemplates) {
      this.validateTemplates(templates)
    }

    const fallbackFormats = formatDetection.fallback_formats.map(item => item.format)

    return {
      id: ideId,
      name: ideName,
      preferred_format: formatDetection.preferred_format,
      fallback_formats: fallbackFormats,
      validation: this.generateValidationRules(formatDetection.preferred_format),
      templates,
      doc_version: version,
      doc_sources: this.extractUniqueSources(docChunks),
      trusted: true,
      last_updated: new Date().toISOString()
    }
  }

  private generateTemplates(primaryFormat: PromptFormat, docChunks: DocChunk[]): PromptTemplate {
    const templates: PromptTemplate = {}

    if (this.options.includeAllFormats) {
      templates.json = this.generateJsonTemplate(docChunks)
      templates.markdown = this.generateMarkdownTemplate(docChunks)
      templates.plaintext = this.generatePlaintextTemplate(docChunks)
      templates.cli = this.generateCliTemplate(docChunks)
      templates.xml = this.generateXmlTemplate(docChunks)
    } else {
      // Only generate template for primary format
      switch (primaryFormat) {
        case 'json':
          templates.json = this.generateJsonTemplate(docChunks)
          break
        case 'markdown':
          templates.markdown = this.generateMarkdownTemplate(docChunks)
          break
        case 'plaintext':
          templates.plaintext = this.generatePlaintextTemplate(docChunks)
          break
        case 'cli':
          templates.cli = this.generateCliTemplate(docChunks)
          break
        case 'xml':
          templates.xml = this.generateXmlTemplate(docChunks)
          break
      }
    }

    return templates
  }

  private generateJsonTemplate(_docChunks: DocChunk[]): string {
    return JSON.stringify(
      {
        system:
          'You are a helpful assistant specialized in this IDE. ' +
          'Provide clear, concise responses tailored to the user\'s needs.',
        user: 'What would you like to know about this IDE?',
        context: {
          ide_specific_features: [],
          code_examples: [],
          best_practices: []
        }
      },
      null,
      2
    )
  }

  private generateMarkdownTemplate(_docChunks: DocChunk[]): string {
    return `# Prompt Template

## System

You are a helpful assistant specialized in this IDE. 
Provide clear, concise responses tailored to the user's needs.

### IDE-Specific Features
- Feature 1
- Feature 2
- Feature 3

### Best Practices
1. Practice 1
2. Practice 2
3. Practice 3

## User

What would you like to know about this IDE?

### Context
Include relevant information about your task or question.

### Examples
Provide examples if applicable.
`
  }

  private generatePlaintextTemplate(_docChunks: DocChunk[]): string {
    return `SYSTEM:
You are a helpful assistant specialized in this IDE. 
Provide clear, concise responses tailored to the user's needs.

IDE-SPECIFIC FEATURES:
- Feature 1
- Feature 2
- Feature 3

BEST PRACTICES:
1. Practice 1
2. Practice 2
3. Practice 3

USER:
What would you like to know about this IDE?

CONTEXT:
Include relevant information about your task or question.

EXAMPLES:
Provide examples if applicable.
`
  }

  private generateCliTemplate(_docChunks: DocChunk[]): string {
    return `--system "You are a helpful assistant specialized in this IDE. Provide clear, concise responses tailored to the user's needs." --user "What would you like to know about this IDE?" --context "Include relevant information about your task or question." --format json`
  }

  private generateXmlTemplate(_docChunks: DocChunk[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <system>
    <base>You are a helpful assistant specialized in this IDE. Provide clear, concise responses tailored to the user's needs.</base>
    <ide_features>
      <feature>Feature 1</feature>
      <feature>Feature 2</feature>
      <feature>Feature 3</feature>
    </ide_features>
    <best_practices>
      <practice>Practice 1</practice>
      <practice>Practice 2</practice>
      <practice>Practice 3</practice>
    </best_practices>
  </system>
  <user>
    <question>What would you like to know about this IDE?</question>
    <context>Include relevant information about your task or question.</context>
    <examples>Provide examples if applicable.</examples>
  </user>
</prompt>
`
  }

  private generateValidationRules(format: PromptFormat): ManifestValidation {
    const baseRules = [
      'Must have both system and user sections',
      'Each section should be non-empty',
      'Should follow the IDE-specific format guidelines',
      'Code examples should be properly formatted'
    ]

    let formatSpecificRules: string[] = []

    switch (format) {
      case 'json':
        formatSpecificRules = [
          'Valid JSON syntax required',
          'Must include "system" field',
          'Must include "user" field',
          'All strings must be properly escaped'
        ]
        break
      case 'markdown':
        formatSpecificRules = [
          'Valid Markdown syntax required',
          'Must have System and User sections as headers',
          'Code blocks should use proper language fencing',
          'Links should use Markdown link syntax'
        ]
        break
      case 'plaintext':
        formatSpecificRules = [
          'Plain text format with clear section separators',
          'Sections must be prefixed with UPPERCASE labels',
          'Each section should be on its own line',
          'No special characters required'
        ]
        break
      case 'cli':
        formatSpecificRules = [
          'Valid command-line syntax required',
          'Flags must use proper -- or - notation',
          'Arguments must be properly quoted',
          'Option names should be lowercase with hyphens'
        ]
        break
      case 'xml':
        formatSpecificRules = [
          'Valid XML syntax required',
          'Must have system and user root elements',
          'All tags must be properly closed',
          'Special characters must be properly escaped'
        ]
        break
    }

    return {
      type: format === 'json' ? 'json-schema' : `${format}-schema`,
      rules: [...baseRules, ...formatSpecificRules]
    }
  }

  private extractUniqueSources(docChunks: DocChunk[]): string[] {
    const sources = new Set<string>()

    for (const chunk of docChunks) {
      if (chunk.source_url) {
        sources.add(chunk.source_url)
      }
    }

    return Array.from(sources).sort()
  }

  private validateTemplates(templates: PromptTemplate): void {
    for (const [format, template] of Object.entries(templates)) {
      try {
        this.validateTemplate(format as PromptFormat, template)
      } catch (error) {
        console.warn(`Template validation warning for ${format}:`, error)
      }
    }
  }

  private validateTemplate(format: PromptFormat, template: string): void {
    if (!template || template.trim().length === 0) {
      throw new Error(`Template for format ${format} is empty`)
    }

    switch (format) {
      case 'json':
        try {
          JSON.parse(template)
        } catch (e) {
          throw new Error(`Invalid JSON template: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
        break

      case 'xml':
        if (!template.includes('<?xml') && !template.includes('<')) {
          throw new Error('XML template appears to be malformed')
        }
        // Basic XML validation
        const openTags = (template.match(/<[^/][^>]*>/g) || []).length
        const closeTags = (template.match(/<\/[^>]+>/g) || []).length
        if (openTags !== closeTags) {
          throw new Error('XML template has mismatched tags')
        }
        break

      case 'markdown':
        if (!template.includes('#')) {
          throw new Error('Markdown template should contain headers')
        }
        break

      case 'cli':
        if (!template.includes('--')) {
          console.warn('CLI template may be missing flags')
        }
        break

      case 'plaintext':
        if (
          !template.includes('SYSTEM:') &&
          !template.includes('system:') &&
          !template.includes('System:')
        ) {
          console.warn('Plaintext template may be missing system section')
        }
        break
    }
  }
}

export const defaultManifestBuilder = new ManifestBuilder()
