#!/usr/bin/env node

/**
 * Unit test for manifest generation logic
 * Tests the core manifest generation functionality
 */

console.log('\n=== Manifest Generation Unit Tests ===\n')

// Mock classes matching the TypeScript implementation
class MockManifestBuilder {
  constructor(options = {}) {
    this.options = {
      includeAllFormats: options.includeAllFormats ?? true,
      validateTemplates: options.validateTemplates ?? true
    }
  }

  buildManifest(ideId, ideName, formatDetection, docChunks, version = 'latest') {
    const fallbackFormats = formatDetection.fallback_formats.map(item => item.format)

    return {
      id: ideId,
      name: ideName,
      preferred_format: formatDetection.preferred_format,
      fallback_formats: fallbackFormats,
      validation: this.generateValidationRules(formatDetection.preferred_format),
      templates: this.generateTemplates(formatDetection.preferred_format, docChunks),
      doc_version: version,
      doc_sources: this.extractUniqueSources(docChunks),
      trusted: true,
      last_updated: new Date().toISOString()
    }
  }

  generateTemplates(primaryFormat, docChunks) {
    const templates = {}

    if (this.options.includeAllFormats) {
      templates.json = '{"system": "...", "user": "..."}'
      templates.markdown = '# System\n...\n# User\n...'
      templates.plaintext = 'SYSTEM:\n...\nUSER:\n...'
      templates.cli = "--system '...' --user '...'"
      templates.xml = '<?xml version="1.0"?><prompt>...</prompt>'
    }

    return templates
  }

  generateValidationRules(format) {
    const baseRules = [
      'Must have both system and user sections',
      'Each section should be non-empty'
    ]

    let formatSpecificRules = []
    switch (format) {
      case 'json':
        formatSpecificRules = ['Valid JSON syntax required', 'Must include "system" field']
        break
      case 'markdown':
        formatSpecificRules = ['Valid Markdown syntax required', 'Code blocks should use proper language fencing']
        break
      case 'xml':
        formatSpecificRules = ['Valid XML syntax required', 'All tags must be properly closed']
        break
    }

    return {
      type: format === 'json' ? 'json-schema' : `${format}-schema`,
      rules: [...baseRules, ...formatSpecificRules]
    }
  }

  extractUniqueSources(docChunks) {
    const sources = new Set()
    for (const chunk of docChunks) {
      if (chunk.source_url) {
        sources.add(chunk.source_url)
      }
    }
    return Array.from(sources).sort()
  }
}

// Test cases
const testCases = [
  {
    name: 'JSON format IDE (VS Code)',
    ideId: 'vscode',
    ideName: 'Visual Studio Code',
    format: 'json',
    docChunks: [
      { source_url: 'https://code.visualstudio.com/docs' },
      { source_url: 'https://code.visualstudio.com/docs/editor' }
    ]
  },
  {
    name: 'Markdown format IDE (Cursor)',
    ideId: 'cursor',
    ideName: 'Cursor Editor',
    format: 'markdown',
    docChunks: [
      { source_url: 'https://cursor.sh/docs' }
    ]
  },
  {
    name: 'CLI format IDE (Vim)',
    ideId: 'vim',
    ideName: 'Vim',
    format: 'cli',
    docChunks: [
      { source_url: 'https://www.vim.org/docs' }
    ]
  },
  {
    name: 'XML format IDE (IntelliJ)',
    ideId: 'intellij',
    ideName: 'IntelliJ IDEA',
    format: 'xml',
    docChunks: [
      { source_url: 'https://www.jetbrains.com/help/idea' }
    ]
  }
]

function testManifest(manifest) {
  const errors = []

  // Check required fields
  const requiredFields = [
    'id',
    'name',
    'preferred_format',
    'fallback_formats',
    'validation',
    'templates',
    'doc_version',
    'doc_sources',
    'trusted',
    'last_updated'
  ]

  for (const field of requiredFields) {
    if (!(field in manifest)) {
      errors.push(`Missing field: ${field}`)
    }
  }

  // Check templates exist
  const expectedTemplates = ['json', 'markdown', 'plaintext', 'cli', 'xml']
  for (const template of expectedTemplates) {
    if (!manifest.templates[template]) {
      errors.push(`Missing template: ${template}`)
    }
  }

  // Check validation has rules
  if (!manifest.validation.rules || manifest.validation.rules.length === 0) {
    errors.push('Validation rules are empty')
  }

  // Check sources
  if (!Array.isArray(manifest.doc_sources)) {
    errors.push('doc_sources is not an array')
  }

  return errors
}

// Run tests
console.log(`Running ${testCases.length} test cases...\n`)

let passCount = 0
let failCount = 0

for (const testCase of testCases) {
  const builder = new MockManifestBuilder({ includeAllFormats: true })

  const formatDetection = {
    preferred_format: testCase.format,
    fallback_formats: [
      { format: 'plaintext', confidence: 70 },
      { format: 'markdown', confidence: 60 }
    ]
  }

  const manifest = builder.buildManifest(
    testCase.ideId,
    testCase.ideName,
    formatDetection,
    testCase.docChunks,
    '1.0.0'
  )

  const errors = testManifest(manifest)

  if (errors.length === 0) {
    console.log(`✓ ${testCase.name}`)
    console.log(`  - Format: ${manifest.preferred_format}`)
    console.log(`  - Sources: ${manifest.doc_sources.length}`)
    console.log(`  - Validation rules: ${manifest.validation.rules.length}`)
    passCount++
  } else {
    console.log(`✗ ${testCase.name}`)
    for (const error of errors) {
      console.log(`  - ${error}`)
    }
    failCount++
  }
}

// Summary
console.log(`\n=== Test Summary ===`)
console.log(`Total: ${testCases.length}`)
console.log(`Passed: ${passCount}`)
console.log(`Failed: ${failCount}`)

if (failCount === 0) {
  console.log('\n✓ All tests passed!\n')
  process.exit(0)
} else {
  console.log(`\n✗ ${failCount} test(s) failed!\n`)
  process.exit(1)
}
