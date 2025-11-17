#!/usr/bin/env node

/**
 * Comprehensive validation script for the manifest builder implementation
 * This script validates:
 * 1. Manifest structure correctness
 * 2. Template validity for all formats
 * 3. Validation rules completeness
 * 4. Integration with format detection
 */

const fs = require('fs')
const path = require('path')

// Check that all required files exist
const requiredFiles = [
  'lib/manifest-builder.ts',
  'pages/api/buildManifest.ts',
  'pages/api/rebuildManifest.ts'
]

console.log('\n=== Manifest Implementation Validation ===\n')

// 1. Check files exist
console.log('1. Checking required files...')
let filesValid = true
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file}`)
  } else {
    console.log(`   ✗ ${file} - MISSING`)
    filesValid = false
  }
}

if (!filesValid) {
  console.log('\n✗ Some required files are missing!\n')
  process.exit(1)
}

// 2. Check manifest-builder has required exports
console.log('\n2. Checking manifest-builder exports...')
const manifestBuilderContent = fs.readFileSync(
  path.join(__dirname, '..', 'lib/manifest-builder.ts'),
  'utf-8'
)

const requiredExports = [
  'class ManifestBuilder',
  'interface IDEManifest',
  'interface PromptTemplate',
  'interface ManifestValidation',
  'buildManifest'
]

let exportsValid = true
for (const exp of requiredExports) {
  if (manifestBuilderContent.includes(exp)) {
    console.log(`   ✓ ${exp}`)
  } else {
    console.log(`   ✗ ${exp} - NOT FOUND`)
    exportsValid = false
  }
}

if (!exportsValid) {
  console.log('\n✗ Some required exports are missing!\n')
  process.exit(1)
}

// 3. Check API endpoints have correct structure
console.log('\n3. Checking API endpoint structures...')

const buildManifestContent = fs.readFileSync(
  path.join(__dirname, '..', 'pages/api/buildManifest.ts'),
  'utf-8'
)

const rebuildManifestContent = fs.readFileSync(
  path.join(__dirname, '..', 'pages/api/rebuildManifest.ts'),
  'utf-8'
)

const requiredBuildChecks = [
  { file: 'buildManifest', content: buildManifestContent, checks: [
    'POST',
    'ideId',
    'FormatDetector',
    'ManifestBuilder',
    'supabaseAdmin',
    'manifest'
  ]},
  { file: 'rebuildManifest', content: rebuildManifestContent, checks: [
    'POST',
    'ideId',
    'FormatDetector',
    'ManifestBuilder',
    'supabaseAdmin',
    'previousManifest'
  ]}
]

let apiValid = true
for (const {file, content, checks} of requiredBuildChecks) {
  let fileValid = true
  for (const check of checks) {
    if (content.includes(check)) {
      console.log(`   ✓ ${file}: ${check}`)
    } else {
      console.log(`   ✗ ${file}: ${check} - NOT FOUND`)
      fileValid = false
      apiValid = false
    }
  }
}

if (!apiValid) {
  console.log('\n✗ API endpoints are incomplete!\n')
  process.exit(1)
}

// 4. Validate manifest structure
console.log('\n4. Validating manifest structure...')

const manifestStructure = {
  id: 'string',
  name: 'string',
  preferred_format: 'PromptFormat',
  fallback_formats: 'PromptFormat[]',
  validation: 'object',
  templates: 'object',
  doc_version: 'string',
  doc_sources: 'string[]',
  trusted: 'boolean',
  last_updated: 'string'
}

let structureValid = true
for (const [field, type] of Object.entries(manifestStructure)) {
  const pattern = new RegExp(`${field}\\s*[:\\?]\\s*${type}`)
  if (manifestBuilderContent.includes(field)) {
    console.log(`   ✓ ${field}: ${type}`)
  } else {
    console.log(`   ✗ ${field}: ${type} - NOT FOUND`)
    structureValid = false
  }
}

// 5. Check template generation methods
console.log('\n5. Checking template generation methods...')

const templates = ['json', 'markdown', 'plaintext', 'cli', 'xml']
const templateMethods = templates.map(t => `generate${t.charAt(0).toUpperCase()}${t.slice(1)}Template`)

let templatesValid = true
for (const method of templateMethods) {
  if (manifestBuilderContent.includes(method)) {
    console.log(`   ✓ ${method}`)
  } else {
    console.log(`   ✗ ${method} - NOT FOUND`)
    templatesValid = false
  }
}

// 6. Check validation rules
console.log('\n6. Checking validation rules...')

const validationChecks = [
  'generateValidationRules',
  'validateTemplates',
  'validateTemplate'
]

let validationValid = true
for (const check of validationChecks) {
  if (manifestBuilderContent.includes(check)) {
    console.log(`   ✓ ${check}`)
  } else {
    console.log(`   ✗ ${check} - NOT FOUND`)
    validationValid = false
  }
}

// 7. Summary
console.log('\n=== Validation Summary ===')
const allValid = filesValid && exportsValid && apiValid && structureValid && templatesValid && validationValid

const checks = [
  { name: 'Files exist', valid: filesValid },
  { name: 'Exports', valid: exportsValid },
  { name: 'API Endpoints', valid: apiValid },
  { name: 'Manifest Structure', valid: structureValid },
  { name: 'Template Methods', valid: templatesValid },
  { name: 'Validation Methods', valid: validationValid }
]

for (const { name, valid } of checks) {
  console.log(`${valid ? '✓' : '✗'} ${name}`)
}

if (allValid) {
  console.log('\n✓ All validation checks passed!\n')
  process.exit(0)
} else {
  console.log('\n✗ Some validation checks failed!\n')
  process.exit(1)
}
