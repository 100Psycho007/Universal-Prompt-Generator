import { PromptValidator } from '@/lib/prompt-validator'
import { VALIDATION_TEST_PROMPTS } from '../fixtures/test-data'

describe('PromptValidator', () => {
  let validator: PromptValidator

  beforeEach(() => {
    validator = new PromptValidator()
  })

  describe('JSON Validation', () => {
    it('should validate correct JSON prompt', () => {
      const result = validator.validate('json', VALIDATION_TEST_PROMPTS.json.valid)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.format).toBe('json')
    })

    it('should detect invalid JSON syntax', () => {
      const result = validator.validate('json', '{ invalid json')

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Invalid JSON')
    })

    it('should detect missing system field', () => {
      const prompt = JSON.stringify({ user: 'Help me' })
      const result = validator.validate('json', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('system'))).toBe(true)
    })

    it('should detect missing user field', () => {
      const prompt = JSON.stringify({ system: 'You are helpful' })
      const result = validator.validate('json', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('user'))).toBe(true)
    })

    it('should detect empty system field', () => {
      const prompt = JSON.stringify({ system: '', user: 'Help' })
      const result = validator.validate('json', prompt)

      expect(result.isValid).toBe(false)
    })

    it('should detect invalid context structure', () => {
      const prompt = JSON.stringify({ 
        system: 'System', 
        user: 'User', 
        context: 'should be object' 
      })
      const result = validator.validate('json', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('context'))).toBe(true)
    })

    it('should allow valid context object', () => {
      const prompt = JSON.stringify({
        system: 'System',
        user: 'User',
        context: { language: 'TypeScript', files: [] },
      })
      const result = validator.validate('json', prompt)

      expect(result.isValid).toBe(true)
    })
  })

  describe('Markdown Validation', () => {
    it('should validate correct Markdown prompt', () => {
      const result = validator.validate('markdown', VALIDATION_TEST_PROMPTS.markdown.valid)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing System section', () => {
      const prompt = '# Prompt\n## Task\nDo something'
      const result = validator.validate('markdown', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('System'))).toBe(true)
    })

    it('should detect missing Task section', () => {
      const prompt = '# Prompt\n## System\nYou are helpful'
      const result = validator.validate('markdown', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('task') || e.includes('Task'))).toBe(true)
    })

    it('should warn about missing User Guidance section', () => {
      const prompt = '# Prompt\n## System\nSystem text\n### Task Overview\nTask text'
      const result = validator.validate('markdown', prompt)

      expect(result.warnings.some(w => w.includes('User Guidance'))).toBe(true)
    })

    it('should warn about missing code blocks', () => {
      const prompt = '# Prompt\n## System\nSystem\n### Task Overview\nTask\n## User Guidance\nGuidance'
      const result = validator.validate('markdown', prompt)

      expect(result.warnings.some(w => w.includes('code block'))).toBe(true)
    })

    it('should accept prompts with code blocks', () => {
      const prompt = '# Prompt\n## System\nSystem\n### Task Overview\nTask\n```js\ncode\n```\n## User Guidance\nGuidance'
      const result = validator.validate('markdown', prompt)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('code block'))).toBe(false)
    })
  })

  describe('Plaintext Validation', () => {
    it('should validate correct plaintext prompt', () => {
      const result = validator.validate('plaintext', VALIDATION_TEST_PROMPTS.plaintext.valid)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing SYSTEM section', () => {
      const prompt = 'TASK:\nDo something'
      const result = validator.validate('plaintext', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('SYSTEM:'))).toBe(true)
    })

    it('should detect missing TASK section', () => {
      const prompt = 'SYSTEM:\nYou are helpful\nLANGUAGE:\nJS\nCONSTRAINTS:\nNone\nFILES:\nNone'
      const result = validator.validate('plaintext', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('TASK:'))).toBe(true)
    })

    it('should detect missing LANGUAGE section', () => {
      const prompt = 'SYSTEM:\nHelpful\nTASK:\nCode\nCONSTRAINTS:\nNone\nFILES:\nNone'
      const result = validator.validate('plaintext', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('LANGUAGE:'))).toBe(true)
    })

    it('should detect missing CONSTRAINTS section', () => {
      const prompt = 'SYSTEM:\nHelpful\nTASK:\nCode\nLANGUAGE:\nJS\nFILES:\nNone'
      const result = validator.validate('plaintext', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('CONSTRAINTS:'))).toBe(true)
    })

    it('should detect missing FILES section', () => {
      const prompt = 'SYSTEM:\nHelpful\nTASK:\nCode\nLANGUAGE:\nJS\nCONSTRAINTS:\nNone'
      const result = validator.validate('plaintext', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('FILES:'))).toBe(true)
    })
  })

  describe('CLI Validation', () => {
    it('should validate correct CLI prompt', () => {
      const result = validator.validate('cli', VALIDATION_TEST_PROMPTS.cli.valid)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing --system flag', () => {
      const prompt = '--user "Help" --language "JS"'
      const result = validator.validate('cli', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('--system'))).toBe(true)
    })

    it('should detect missing --user flag', () => {
      const prompt = '--system "Helpful" --language "JS"'
      const result = validator.validate('cli', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('--user'))).toBe(true)
    })

    it('should detect missing --language flag', () => {
      const prompt = '--system "Helpful" --user "Help"'
      const result = validator.validate('cli', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('--language'))).toBe(true)
    })

    it('should warn about improper quoting', () => {
      const prompt = '--system Helpful --user "Help" --language "JS"'
      const result = validator.validate('cli', prompt)

      expect(result.warnings.some(w => w.includes('quoted'))).toBe(true)
    })

    it('should warn about missing format flag', () => {
      const prompt = '--system "Helpful" --user "Help" --language "JS"'
      const result = validator.validate('cli', prompt)

      expect(result.warnings.some(w => w.includes('format'))).toBe(true)
    })
  })

  describe('XML Validation', () => {
    it('should validate correct XML prompt', () => {
      const result = validator.validate('xml', VALIDATION_TEST_PROMPTS.xml.valid)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing system element', () => {
      const prompt = '<?xml version="1.0"?><prompt><user>Help</user></prompt>'
      const result = validator.validate('xml', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('<system>'))).toBe(true)
    })

    it('should detect missing user element', () => {
      const prompt = '<?xml version="1.0"?><prompt><system>Helpful</system></prompt>'
      const result = validator.validate('xml', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('<user>'))).toBe(true)
    })

    it('should warn about missing XML declaration', () => {
      const prompt = '<prompt><system>Helpful</system><user>Help</user></prompt>'
      const result = validator.validate('xml', prompt)

      expect(result.warnings.some(w => w.includes('XML declaration'))).toBe(true)
    })

    it('should detect mismatched tags', () => {
      const prompt = '<?xml version="1.0"?><prompt><system>Text<user>Help</user></prompt>'
      const result = validator.validate('xml', prompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('mismatched'))).toBe(true)
    })

    it('should handle self-closing tags', () => {
      const prompt = '<?xml version="1.0"?><prompt><system>Helpful</system><user>Help</user><empty/></prompt>'
      const result = validator.validate('xml', prompt)

      expect(result.isValid).toBe(true)
    })

    it('should detect unclosed tags', () => {
      const prompt = VALIDATION_TEST_PROMPTS.xml.invalid
      const result = validator.validate('xml', prompt)

      expect(result.isValid).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should detect empty prompt', () => {
      const result = validator.validate('json', '')

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('empty'))).toBe(true)
    })

    it('should detect whitespace-only prompt', () => {
      const result = validator.validate('json', '   \n\t  ')

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('empty'))).toBe(true)
    })

    it('should handle very long prompts', () => {
      const longPrompt = JSON.stringify({
        system: 'x'.repeat(10000),
        user: 'y'.repeat(10000),
        context: {},
      })
      const result = validator.validate('json', longPrompt)

      expect(result.isValid).toBe(true)
    })

    it('should handle unicode characters', () => {
      const prompt = JSON.stringify({
        system: '你好世界 🚀',
        user: 'Привет мир',
        context: {},
      })
      const result = validator.validate('json', prompt)

      expect(result.isValid).toBe(true)
    })
  })

  describe('Manifest Validation Integration', () => {
    it('should apply manifest validation hints', () => {
      const manifestValidation = {
        type: 'json-schema',
        rules: ['Must have system section', 'Must include context'],
      }

      const prompt = JSON.stringify({ system: 'Help', user: 'User', context: {} })
      const result = validator.validate('json', prompt, manifestValidation)

      expect(result.isValid).toBe(true)
    })

    it('should warn if manifest rules mention system but prompt lacks it', () => {
      const manifestValidation = {
        type: 'markdown-schema',
        rules: ['Must have system section'],
      }

      const prompt = '# Prompt\n### Task\nDo something'
      const result = validator.validate('markdown', prompt, manifestValidation)

      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle null manifest validation', () => {
      const result = validator.validate('json', VALIDATION_TEST_PROMPTS.json.valid, null)

      expect(result).toBeDefined()
    })

    it('should handle undefined manifest validation', () => {
      const result = validator.validate('json', VALIDATION_TEST_PROMPTS.json.valid, undefined)

      expect(result).toBeDefined()
    })
  })

  describe('Format Handling', () => {
    it('should default unknown formats to plaintext validation', () => {
      const result = validator.validate('custom' as any, 'Some text')

      // Should use plaintext validation
      expect(result.format).toBe('custom')
    })
  })

  describe('Error and Warning Messages', () => {
    it('should provide descriptive error messages', () => {
      const result = validator.validate('json', '{ invalid }')

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].length).toBeGreaterThan(10) // Meaningful message
    })

    it('should provide descriptive warning messages', () => {
      const prompt = '# Prompt\n## System\nText\n### Task Overview\nTask'
      const result = validator.validate('markdown', prompt)

      if (result.warnings.length > 0) {
        expect(result.warnings[0].length).toBeGreaterThan(10)
      }
    })

    it('should set isValid based on errors count', () => {
      const validResult = validator.validate('json', VALIDATION_TEST_PROMPTS.json.valid)
      const invalidResult = validator.validate('json', '{ invalid }')

      expect(validResult.isValid).toBe(true)
      expect(invalidResult.isValid).toBe(false)
    })
  })
})
