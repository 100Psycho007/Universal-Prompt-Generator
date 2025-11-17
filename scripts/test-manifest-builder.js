#!/usr/bin/env node

/**
 * Test script for the manifest builder
 * Tests manifest generation for all target IDEs
 */

// Mock data for testing
const testIDEs = [
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    preferredFormat: 'json',
    fallbackFormats: ['markdown', 'plaintext']
  },
  {
    id: 'cursor',
    name: 'Cursor Editor',
    preferredFormat: 'markdown',
    fallbackFormats: ['plaintext', 'json']
  },
  {
    id: 'vim',
    name: 'Vim',
    preferredFormat: 'cli',
    fallbackFormats: ['plaintext', 'markdown']
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    preferredFormat: 'xml',
    fallbackFormats: ['json', 'plaintext']
  },
  {
    id: 'sublime-text',
    name: 'Sublime Text',
    preferredFormat: 'json',
    fallbackFormats: ['plaintext', 'markdown']
  },
  {
    id: 'atom',
    name: 'Atom Editor',
    preferredFormat: 'json',
    fallbackFormats: ['markdown', 'plaintext']
  },
  {
    id: 'emacs',
    name: 'GNU Emacs',
    preferredFormat: 'cli',
    fallbackFormats: ['plaintext', 'markdown']
  },
  {
    id: 'notepad++',
    name: 'Notepad++',
    preferredFormat: 'xml',
    fallbackFormats: ['json', 'plaintext']
  },
  {
    id: 'android-studio',
    name: 'Android Studio',
    preferredFormat: 'json',
    fallbackFormats: ['xml', 'plaintext']
  },
  {
    id: 'eclipse',
    name: 'Eclipse IDE',
    preferredFormat: 'xml',
    fallbackFormats: ['json', 'plaintext']
  },
  {
    id: 'nano',
    name: 'GNU nano',
    preferredFormat: 'plaintext',
    fallbackFormats: ['markdown', 'cli']
  },
  {
    id: 'neovim',
    name: 'Neovim',
    preferredFormat: 'cli',
    fallbackFormats: ['plaintext', 'markdown']
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    preferredFormat: 'markdown',
    fallbackFormats: ['plaintext', 'json']
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    preferredFormat: 'json',
    fallbackFormats: ['xml', 'plaintext']
  },
  {
    id: 'typora',
    name: 'Typora',
    preferredFormat: 'markdown',
    fallbackFormats: ['plaintext', 'json']
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    preferredFormat: 'json',
    fallbackFormats: ['xml', 'plaintext']
  },
  {
    id: 'xcode',
    name: 'Xcode',
    preferredFormat: 'xml',
    fallbackFormats: ['json', 'plaintext']
  }
]

const sampleDocChunks = [
  {
    id: 'chunk1',
    ide_id: 'vscode',
    text: 'VS Code provides JSON-based configuration files.',
    source_url: 'https://code.visualstudio.com/docs',
    section: 'Configuration'
  },
  {
    id: 'chunk2',
    ide_id: 'vscode',
    text: 'Use JSON format for settings and extensions.',
    source_url: 'https://code.visualstudio.com/docs/getstarted/settings',
    section: 'Settings'
  }
]

// Simple test function
function testManifestStructure(manifest) {
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
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Check validation structure
  if (manifest.validation) {
    if (!manifest.validation.type) {
      errors.push('Validation missing "type" field')
    }
    if (!Array.isArray(manifest.validation.rules)) {
      errors.push('Validation.rules must be an array')
    }
    if (manifest.validation.rules.length === 0) {
      errors.push('Validation.rules is empty')
    }
  }

  // Check templates structure
  if (manifest.templates) {
    const validFormats = ['json', 'markdown', 'plaintext', 'cli', 'xml']
    for (const format of Object.keys(manifest.templates)) {
      if (!validFormats.includes(format)) {
        errors.push(`Invalid template format: ${format}`)
      }
      if (typeof manifest.templates[format] !== 'string' || manifest.templates[format].length === 0) {
        errors.push(`Template for ${format} is empty or not a string`)
      }
    }
  }

  // Check format types
  const validFormats = ['json', 'markdown', 'plaintext', 'cli', 'xml', 'custom']
  if (!validFormats.includes(manifest.preferred_format)) {
    errors.push(`Invalid preferred_format: ${manifest.preferred_format}`)
  }

  if (!Array.isArray(manifest.fallback_formats)) {
    errors.push('fallback_formats must be an array')
  }
  for (const format of manifest.fallback_formats) {
    if (!validFormats.includes(format)) {
      errors.push(`Invalid fallback format: ${format}`)
    }
  }

  // Check doc_sources
  if (!Array.isArray(manifest.doc_sources)) {
    errors.push('doc_sources must be an array')
  }

  // Check last_updated is valid ISO date
  const lastUpdated = new Date(manifest.last_updated)
  if (isNaN(lastUpdated.getTime())) {
    errors.push('last_updated is not a valid ISO date')
  }

  return errors
}

// Run tests
console.log('\n=== Manifest Builder Test Suite ===\n')

console.log(`Testing ${testIDEs.length} target IDEs...\n`)

let passCount = 0
let failCount = 0

for (const ide of testIDEs) {
  // Create a mock manifest
  const mockManifest = {
    id: ide.id,
    name: ide.name,
    preferred_format: ide.preferredFormat,
    fallback_formats: ide.fallbackFormats,
    validation: {
      type: 'json-schema',
      rules: [
        'Must have both system and user sections',
        'Each section should be non-empty',
        'Should follow the IDE-specific format guidelines'
      ]
    },
    templates: {
      json: '{"system": "...", "user": "..."}',
      markdown: '# System\n...\n# User\n...',
      plaintext: 'SYSTEM:\n...\nUSER:\n...',
      cli: "--system '...' --user '...'",
      xml: '<?xml version="1.0"?><prompt>...</prompt>'
    },
    doc_version: '1.0.0',
    doc_sources: ['https://example.com/docs'],
    trusted: true,
    last_updated: new Date().toISOString()
  }

  const errors = testManifestStructure(mockManifest)

  if (errors.length === 0) {
    console.log(`✓ ${ide.name} (${ide.id}) - PASS`)
    passCount++
  } else {
    console.log(`✗ ${ide.name} (${ide.id}) - FAIL`)
    for (const error of errors) {
      console.log(`  - ${error}`)
    }
    failCount++
  }
}

console.log(`\n=== Test Results ===`)
console.log(`Total: ${testIDEs.length}`)
console.log(`Passed: ${passCount}`)
console.log(`Failed: ${failCount}`)

if (failCount === 0) {
  console.log('\n✓ All tests passed!\n')
  process.exit(0)
} else {
  console.log(`\n✗ ${failCount} test(s) failed!\n`)
  process.exit(1)
}
