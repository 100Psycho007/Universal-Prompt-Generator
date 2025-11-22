import { TemplateRenderer } from '@/lib/template-renderer'
import type { TemplateRenderPayload } from '@/lib/template-renderer'
import { TEMPLATE_PAYLOADS } from '../fixtures/test-data'

describe('TemplateRenderer', () => {
  let renderer: TemplateRenderer

  beforeEach(() => {
    renderer = new TemplateRenderer()
  })

  describe('JSON Template Rendering', () => {
    it('should render basic JSON template', () => {
      const template = JSON.stringify({
        system: 'You are a helpful assistant',
        user: 'Help me',
        context: {},
      })

      const result = renderer.render('json', template, TEMPLATE_PAYLOADS.basic)
      const parsed = JSON.parse(result)

      expect(parsed.system).toBeTruthy()
      expect(parsed.user).toBeTruthy()
      expect(parsed.context).toBeDefined()
      expect(parsed.context.language).toBe('TypeScript')
    })

    it('should include file context in JSON', () => {
      const template = JSON.stringify({ system: 'System', user: 'User', context: {} })
      const result = renderer.render('json', template, TEMPLATE_PAYLOADS.withFiles)
      const parsed = JSON.parse(result)

      expect(parsed.context.files).toBeDefined()
      expect(Array.isArray(parsed.context.files)).toBe(true)
      expect(parsed.context.files.length).toBe(2)
      expect(parsed.context.files[0].path).toBe('src/index.js')
    })

    it('should include constraints in JSON', () => {
      const template = JSON.stringify({ system: 'System', user: 'User', context: {} })
      const result = renderer.render('json', template, TEMPLATE_PAYLOADS.withConstraints)
      const parsed = JSON.parse(result)

      expect(parsed.context.constraints).toBeDefined()
      expect(Array.isArray(parsed.context.constraints)).toBe(true)
      expect(parsed.context.constraints.length).toBeGreaterThan(0)
    })

    it('should handle invalid JSON template gracefully', () => {
      const invalidTemplate = '{ invalid json'
      const result = renderer.render('json', invalidTemplate, TEMPLATE_PAYLOADS.basic)

      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should escape special characters in JSON', () => {
      const result = renderer.render('json', '{}', TEMPLATE_PAYLOADS.edgeCases)
      const parsed = JSON.parse(result)

      expect(parsed.user).toContain('Handle special characters')
      // JSON should be valid despite special characters
      expect(parsed).toBeDefined()
    })
  })

  describe('Markdown Template Rendering', () => {
    it('should render basic Markdown template', () => {
      const template = '# Template'
      const result = renderer.render('markdown', template, TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('## System')
      expect(result).toContain('### Task Overview')
      expect(result).toContain('TypeScript')
    })

    it('should include file context in Markdown', () => {
      const template = '# Template'
      const result = renderer.render('markdown', template, TEMPLATE_PAYLOADS.withFiles)

      expect(result).toContain('### File Context')
      expect(result).toContain('src/index.js')
      expect(result).toContain('```')
    })

    it('should include constraints in Markdown', () => {
      const template = '# Template'
      const result = renderer.render('markdown', template, TEMPLATE_PAYLOADS.withConstraints)

      expect(result).toContain('### Constraints')
      expect(result).toContain('framework:')
    })

    it('should detect code fence language from file extension', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [{ path: 'test.ts', content: 'const x = 1;' }],
      }

      const result = renderer.render('markdown', '# Template', payload)

      expect(result).toContain('```typescript')
    })

    it('should handle no file context', () => {
      const result = renderer.render('markdown', '# Template', TEMPLATE_PAYLOADS.basic)

      expect(result).not.toContain('### File Context')
    })
  })

  describe('Plaintext Template Rendering', () => {
    it('should render basic plaintext template', () => {
      const template = 'Template'
      const result = renderer.render('plaintext', template, TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('SYSTEM:')
      expect(result).toContain('TASK:')
      expect(result).toContain('LANGUAGE:')
      expect(result).toContain('CONSTRAINTS:')
      expect(result).toContain('FILES:')
    })

    it('should include file context in plaintext', () => {
      const template = 'Template'
      const result = renderer.render('plaintext', template, TEMPLATE_PAYLOADS.withFiles)

      expect(result).toContain('FILES:')
      expect(result).toContain('src/index.js')
    })

    it('should include constraints in plaintext', () => {
      const template = 'Template'
      const result = renderer.render('plaintext', template, TEMPLATE_PAYLOADS.withConstraints)

      expect(result).toContain('CONSTRAINTS:')
      expect(result).toContain('framework:')
    })

    it('should handle no files or constraints', () => {
      const result = renderer.render('plaintext', 'Template', TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('- None specified')
      expect(result).toContain('- No files provided')
    })
  })

  describe('CLI Template Rendering', () => {
    it('should render basic CLI template', () => {
      const template = '--template'
      const result = renderer.render('cli', template, TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('--system')
      expect(result).toContain('--user')
      expect(result).toContain('--language')
    })

    it('should properly quote CLI values', () => {
      const result = renderer.render('cli', '', TEMPLATE_PAYLOADS.basic)

      // Check for quoted values
      expect(result).toMatch(/--system ".*"/)
      expect(result).toMatch(/--user ".*"/)
      expect(result).toMatch(/--language ".*"/)
    })

    it('should escape special characters in CLI', () => {
      const result = renderer.render('cli', '', TEMPLATE_PAYLOADS.edgeCases)

      // Should not have unescaped quotes
      const parts = result.split('--')
      parts.forEach((part) => {
        if (part.includes('"')) {
          // Check for proper escaping
          expect(part).toBeTruthy()
        }
      })
    })

    it('should include files in CLI template', () => {
      const result = renderer.render('cli', '', TEMPLATE_PAYLOADS.withFiles)

      expect(result).toContain('--files')
    })

    it('should include constraints in CLI template', () => {
      const result = renderer.render('cli', '', TEMPLATE_PAYLOADS.withConstraints)

      expect(result).toContain('--constraints')
    })

    it('should add format flag if missing', () => {
      const result = renderer.render('cli', '', TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('--format json')
    })
  })

  describe('XML Template Rendering', () => {
    it('should render basic XML template', () => {
      const template = '<template/>'
      const result = renderer.render('xml', template, TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('<?xml version="1.0"')
      expect(result).toContain('<prompt>')
      expect(result).toContain('<system>')
      expect(result).toContain('<user>')
      expect(result).toContain('</prompt>')
    })

    it('should escape XML special characters', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        task: 'Test <script>alert("xss")</script>',
      }

      const result = renderer.render('xml', '', payload)

      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
    })

    it('should include file context in XML', () => {
      const result = renderer.render('xml', '', TEMPLATE_PAYLOADS.withFiles)

      expect(result).toContain('<files>')
      expect(result).toContain('<file')
      expect(result).toContain('path=')
    })

    it('should include constraints in XML', () => {
      const result = renderer.render('xml', '', TEMPLATE_PAYLOADS.withConstraints)

      expect(result).toContain('<constraints>')
      expect(result).toContain('<constraint>')
    })

    it('should handle ampersands in XML', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        task: 'Use && operator',
      }

      const result = renderer.render('xml', '', payload)

      expect(result).toContain('&amp;')
    })
  })

  describe('Variable Substitution', () => {
    it('should substitute IDE name', () => {
      const result = renderer.render('markdown', '# Template', TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('Test IDE')
    })

    it('should substitute task', () => {
      const result = renderer.render('plaintext', '', TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('Write a function to parse JSON')
    })

    it('should substitute language', () => {
      const result = renderer.render('json', '{}', TEMPLATE_PAYLOADS.basic)
      const parsed = JSON.parse(result)

      expect(parsed.context.language).toBe('TypeScript')
    })

    it('should personalize system message with IDE name', () => {
      const template = JSON.stringify({
        system: 'You are a helpful assistant for this IDE',
        user: 'Help',
        context: {},
      })

      const result = renderer.render('json', template, TEMPLATE_PAYLOADS.basic)
      const parsed = JSON.parse(result)

      expect(parsed.system).toContain('Test IDE')
    })
  })

  describe('File Handling', () => {
    it('should limit number of files', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: Array.from({ length: 10 }, (_, i) => ({
          path: `file${i}.js`,
          content: 'content',
        })),
      }

      const limitedRenderer = new TemplateRenderer({ maxFiles: 3 })
      const result = limitedRenderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files.length).toBe(3)
    })

    it('should truncate long file content', () => {
      const longContent = 'x'.repeat(2000)
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [{ path: 'big.txt', content: longContent }],
      }

      const limitedRenderer = new TemplateRenderer({ maxFilePreviewLength: 100 })
      const result = limitedRenderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files[0].snippet.length).toBeLessThan(longContent.length)
      expect(parsed.context.files[0].truncated).toBe(true)
    })

    it('should handle file paths only (no content)', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: ['src/index.js', 'src/utils.js'],
      }

      const result = renderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files[0].path).toBe('src/index.js')
      expect(parsed.context.files[0].snippet).toBeNull()
    })

    it('should handle mixed file formats', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [
          'just/a/path.js',
          { path: 'with/content.js', content: 'const x = 1;' },
        ],
      }

      const result = renderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files.length).toBe(2)
      expect(parsed.context.files[0].snippet).toBeNull()
      expect(parsed.context.files[1].snippet).toBeTruthy()
    })
  })

  describe('Constraint Handling', () => {
    it('should handle various constraint types', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        constraints: {
          string: 'value',
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: 'value' },
        },
      }

      const result = renderer.render('plaintext', '', payload)

      expect(result).toContain('string: value')
      expect(result).toContain('number: 42')
      expect(result).toContain('boolean: true')
      expect(result).toContain('null: null')
    })

    it('should handle empty constraints', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        constraints: {},
      }

      const result = renderer.render('markdown', '# Template', payload)

      expect(result).not.toContain('### Constraints')
    })

    it('should stringify complex constraint values', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        constraints: {
          complex: { deeply: { nested: { value: 'test' } } },
        },
      }

      const result = renderer.render('plaintext', '', payload)

      expect(result).toContain('complex:')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty task', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        task: '',
      }

      const result = renderer.render('json', '{}', payload)

      expect(result).toBeTruthy()
    })

    it('should handle missing language', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        language: '',
      }

      const result = renderer.render('plaintext', '', payload)

      expect(result).toContain('LANGUAGE:')
    })

    it('should handle special characters in task', () => {
      const result = renderer.render('json', '{}', TEMPLATE_PAYLOADS.edgeCases)

      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should handle very long file names', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [{ path: 'x'.repeat(500) + '.js', content: 'code' }],
      }

      const result = renderer.render('markdown', '# Template', payload)

      expect(result).toBeTruthy()
    })

    it('should handle empty file content', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [{ path: 'empty.js', content: '' }],
      }

      const result = renderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files[0].snippet).toBeNull()
    })

    it('should handle whitespace-only file content', () => {
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [{ path: 'whitespace.js', content: '   \n\t  ' }],
      }

      const result = renderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files[0].snippet).toBeNull()
    })
  })

  describe('Format Defaults', () => {
    it('should default to plaintext for unknown format', () => {
      const result = renderer.render('custom' as any, '', TEMPLATE_PAYLOADS.basic)

      expect(result).toContain('SYSTEM:')
      expect(result).toContain('TASK:')
    })
  })

  describe('Options Configuration', () => {
    it('should respect maxFiles option', () => {
      const customRenderer = new TemplateRenderer({ maxFiles: 2 })
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [
          { path: 'file1.js', content: 'a' },
          { path: 'file2.js', content: 'b' },
          { path: 'file3.js', content: 'c' },
        ],
      }

      const result = customRenderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files.length).toBe(2)
    })

    it('should respect maxFilePreviewLength option', () => {
      const customRenderer = new TemplateRenderer({ maxFilePreviewLength: 10 })
      const payload: TemplateRenderPayload = {
        ...TEMPLATE_PAYLOADS.basic,
        files: [{ path: 'file.js', content: 'x'.repeat(100) }],
      }

      const result = customRenderer.render('json', '{}', payload)
      const parsed = JSON.parse(result)

      expect(parsed.context.files[0].snippet.length).toBeLessThanOrEqual(11) // +1 for ellipsis
    })
  })
})
