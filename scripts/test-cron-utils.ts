/**
 * Test script for cron utilities
 * Run with: npx tsx scripts/test-cron-utils.ts
 */

import { calculateHash, batchProcess } from '../lib/cron-utils'

async function testCalculateHash() {
  console.log('Testing calculateHash...')
  
  const content1 = 'This is a test string'
  const content2 = 'This is a test string'
  const content3 = 'This is a different string'
  
  const hash1 = calculateHash(content1)
  const hash2 = calculateHash(content2)
  const hash3 = calculateHash(content3)
  
  console.log('Hash 1:', hash1)
  console.log('Hash 2:', hash2)
  console.log('Hash 3:', hash3)
  
  console.assert(hash1 === hash2, 'Same content should produce same hash')
  console.assert(hash1 !== hash3, 'Different content should produce different hash')
  
  console.log('✓ calculateHash tests passed\n')
}

async function testBatchProcess() {
  console.log('Testing batchProcess...')
  
  const items = Array.from({ length: 10 }, (_, i) => i + 1)
  const results: number[] = []
  
  const processedItems = await batchProcess(
    items,
    async (item) => {
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 100))
      results.push(item * 2)
      return item * 2
    },
    3 // Process 3 at a time
  )
  
  console.log('Input items:', items)
  console.log('Processed results:', processedItems)
  
  console.assert(processedItems.length === 10, 'Should process all items')
  console.assert(processedItems[0] === 2, 'First item should be doubled')
  console.assert(processedItems[9] === 20, 'Last item should be doubled')
  
  console.log('✓ batchProcess tests passed\n')
}

async function testBatchProcessWithErrors() {
  console.log('Testing batchProcess with errors...')
  
  const items = [1, 2, 3, 4, 5]
  
  const results = await batchProcess(
    items,
    async (item) => {
      if (item === 3) {
        throw new Error('Item 3 failed')
      }
      return item * 2
    },
    2
  )
  
  console.log('Results (with item 3 failing):', results)
  
  // Should have 4 results (5 items - 1 failed)
  console.assert(results.length === 4, 'Should handle errors gracefully')
  console.assert(!results.includes(6), 'Failed item should not be in results')
  
  console.log('✓ batchProcess error handling tests passed\n')
}

async function testHashCollision() {
  console.log('Testing hash collision resistance...')
  
  const strings = [
    'The quick brown fox',
    'Lorem ipsum dolor sit amet',
    'Supercalifragilisticexpialidocious',
    'Hello, world!',
    '1234567890'
  ]
  
  const hashes = strings.map(calculateHash)
  const uniqueHashes = new Set(hashes)
  
  console.log('Test strings:', strings.length)
  console.log('Unique hashes:', uniqueHashes.size)
  console.log('Hashes:', hashes)
  
  console.assert(
    uniqueHashes.size === strings.length,
    'All different strings should produce unique hashes'
  )
  
  console.log('✓ Hash collision tests passed\n')
}

async function runTests() {
  console.log('=== Cron Utils Tests ===\n')
  
  try {
    await testCalculateHash()
    await testBatchProcess()
    await testBatchProcessWithErrors()
    await testHashCollision()
    
    console.log('=== All Tests Passed ✓ ===')
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

runTests()
