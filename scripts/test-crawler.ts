import { supabaseAdmin } from '../lib/supabase-client'
import { crawlDocumentation } from '../lib/crawler'

interface TestCase {
  ideName: string
  seedUrls?: string[]
  maxPages?: number
}

const TEST_IDES: TestCase[] = [
  {
    ideName: 'Cursor',
    seedUrls: ['https://docs.cursor.com'],
    maxPages: 50
  },
  {
    ideName: 'Windsurf',
    seedUrls: ['https://docs.windsurf.dev'],
    maxPages: 50
  },
  {
    ideName: 'Continue.dev',
    seedUrls: ['https://docs.continue.dev'],
    maxPages: 50
  },
  {
    ideName: 'GitHub Copilot',
    seedUrls: ['https://docs.github.com/en/copilot'],
    maxPages: 50
  },
  {
    ideName: 'Cody',
    seedUrls: ['https://docs.sourcegraph.com/cody'],
    maxPages: 50
  }
]

async function testCrawler() {
  console.log('Starting crawler test...\n')

  const results = []

  for (const testCase of TEST_IDES) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing: ${testCase.ideName}`)
    console.log('='.repeat(60))

    try {
      const { data: ide, error } = await supabaseAdmin
        .from('ides')
        .select('id, name, docs_url')
        .eq('name', testCase.ideName)
        .maybeSingle()

      if (error || !ide) {
        console.error(`❌ IDE not found: ${testCase.ideName}`)
        results.push({ ide: testCase.ideName, success: false, error: 'IDE not found' })
        continue
      }

      const seedUrls = testCase.seedUrls?.length ? testCase.seedUrls : [ide.docs_url].filter(Boolean) as string[]

      if (seedUrls.length === 0) {
        console.error(`❌ No seed URLs for ${testCase.ideName}`)
        results.push({ ide: testCase.ideName, success: false, error: 'No seed URLs' })
        continue
      }

      console.log(`📍 Seed URLs: ${seedUrls.join(', ')}`)
      console.log(`📊 Max pages: ${testCase.maxPages || 50}`)
      console.log('\n🔍 Starting crawl...')

      const stats = await crawlDocumentation(
        seedUrls[0],
        seedUrls,
        ide.id,
        undefined,
        {
          maxPages: testCase.maxPages || 50,
          maxDepth: 3,
          rateLimit: 750,
          respectRobotsTxt: true,
          exponentialBackoff: true
        }
      )

      console.log('\n✅ Crawl completed!')
      console.log(`   Total pages: ${stats.totalPages}`)
      console.log(`   Successful: ${stats.successfulPages}`)
      console.log(`   Failed: ${stats.failedPages}`)
      console.log(`   Skipped: ${stats.skippedPages}`)
      console.log(`   Stored chunks: ${stats.storedChunks}`)
      console.log(`   Total bytes: ${(stats.totalBytes / 1024).toFixed(2)} KB`)
      
      const duration = stats.endTime && stats.startTime
        ? (stats.endTime.getTime() - stats.startTime.getTime()) / 1000
        : 0
      console.log(`   Duration: ${duration.toFixed(2)}s`)

      if (stats.errors.length > 0) {
        console.log(`\n⚠️  Errors (${stats.errors.length}):`)
        stats.errors.slice(0, 5).forEach(err => {
          console.log(`   - ${err.url}: ${err.error}`)
        })
        if (stats.errors.length > 5) {
          console.log(`   ... and ${stats.errors.length - 5} more`)
        }
      }

      results.push({
        ide: testCase.ideName,
        success: stats.storedChunks > 0,
        stats
      })
    } catch (error) {
      console.error(`\n❌ Error crawling ${testCase.ideName}:`, error)
      results.push({
        ide: testCase.ideName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  console.log('\n\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`\nTotal IDEs tested: ${results.length}`)
  console.log(`Successful: ${successful}`)
  console.log(`Failed: ${failed}`)

  console.log('\nDetailed results:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.ide}`)
    if ('stats' in result && result.stats) {
      console.log(`   Chunks stored: ${result.stats.storedChunks}`)
    }
    if ('error' in result && result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })

  console.log('\n' + '='.repeat(60))

  const finalSuccess = successful === results.length
  if (finalSuccess) {
    console.log('✅ All crawler tests passed!')
  } else {
    console.log(`⚠️  ${failed} test(s) failed`)
  }

  process.exit(finalSuccess ? 0 : 1)
}

testCrawler().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
