import { supabaseAdmin } from '../lib/supabase-client'
import { crawlDocumentation } from '../lib/crawler'

async function crawlCursor() {
  console.log('🔍 Starting Cursor documentation crawl...\n')

  if (!supabaseAdmin) {
    console.error('❌ Error: Supabase admin client not initialized')
    process.exit(1)
  }

  const { data: ide, error } = await (supabaseAdmin as any)
    .from('ides')
    .select('id, name, docs_url')
    .eq('name', 'Cursor')
    .maybeSingle()

  if (error || !ide) {
    console.error('❌ Error: Cursor IDE not found in database')
    console.error('Please run migrations and seed data first:')
    console.error('  npm run db:migrate')
    process.exit(1)
  }

  console.log(`📚 IDE: ${ide.name}`)
  console.log(`🌐 Docs URL: ${ide.docs_url}\n`)

  const seedUrls = [
    'https://docs.cursor.com',
    'https://docs.cursor.com/get-started/migrate-from-vscode'
  ]

  console.log('🚀 Starting crawl with options:')
  console.log('  - Max pages: 50')
  console.log('  - Max depth: 3')
  console.log('  - Rate limit: 750ms between requests')
  console.log('  - Respects robots.txt: true\n')

  try {
    const stats = await crawlDocumentation(
      seedUrls[0],
      seedUrls,
      ide.id,
      undefined,
      {
        maxPages: 50,
        maxDepth: 3,
        rateLimit: 750,
        respectRobotsTxt: true,
        exponentialBackoff: true
      }
    )

    const duration = stats.endTime && stats.startTime
      ? (stats.endTime.getTime() - stats.startTime.getTime()) / 1000
      : 0

    console.log('\n✅ Crawl completed!\n')
    console.log('📊 Statistics:')
    console.log(`  Total pages: ${stats.totalPages}`)
    console.log(`  Successful: ${stats.successfulPages}`)
    console.log(`  Failed: ${stats.failedPages}`)
    console.log(`  Skipped: ${stats.skippedPages}`)
    console.log(`  Stored chunks: ${stats.storedChunks}`)
    console.log(`  Total bytes: ${(stats.totalBytes / 1024).toFixed(2)} KB`)
    console.log(`  Duration: ${duration.toFixed(2)}s`)
    console.log(`  Avg speed: ${(stats.totalPages / duration).toFixed(2)} pages/s`)

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (${stats.errors.length}):`)
      stats.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.url}`)
        console.log(`    ${err.error}`)
      })
      if (stats.errors.length > 5) {
        console.log(`  ... and ${stats.errors.length - 5} more`)
      }
    }

    const { count } = await (supabaseAdmin as any)
      .from('doc_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('ide_id', ide.id)

    console.log(`\n📦 Total chunks in database for ${ide.name}: ${count ?? 0}`)

  } catch (error) {
    console.error('\n❌ Crawl failed:', error)
    process.exit(1)
  }
}

crawlCursor()
