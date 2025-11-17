#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const migrationsPath = path.join(__dirname, '../migrations')

console.log('🚀 Setting up Universal IDE Database...\n')

// Check if migrations directory exists
if (!fs.existsSync(migrationsPath)) {
  console.error('❌ Migrations directory not found!')
  process.exit(1)
}

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsPath)
  .filter(file => file.endsWith('.sql'))
  .sort()

console.log(`📝 Found ${migrationFiles.length} migration files:`)
migrationFiles.forEach(file => console.log(`  - ${file}`))
console.log('')

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'pipe' })
  console.log('✅ Supabase CLI is installed')
} catch (error) {
  console.error('❌ Supabase CLI not found. Please install it first:')
  console.error('   npm install -g supabase')
  process.exit(1)
}

// Check if Supabase is running
try {
  execSync('supabase status', { stdio: 'pipe' })
  console.log('✅ Supabase is running')
} catch (error) {
  console.log('🔄 Starting Supabase...')
  try {
    execSync('supabase start', { stdio: 'inherit' })
    console.log('✅ Supabase started successfully')
  } catch (startError) {
    console.error('❌ Failed to start Supabase')
    process.exit(1)
  }
}

// Apply migrations
console.log('\n📦 Applying migrations...')
migrationFiles.forEach((file, index) => {
  console.log(`  [${index + 1}/${migrationFiles.length}] Applying ${file}...`)
  try {
    const migrationPath = path.join(migrationsPath, file)
    execSync(`supabase db push --db-url "postgresql://postgres:postgres@localhost:54322/postgres"`, { stdio: 'pipe' })
    console.log(`    ✅ ${file} applied successfully`)
  } catch (error) {
    console.error(`    ❌ Failed to apply ${file}`)
    console.error(`    Error: ${error.message}`)
  }
})

// Generate TypeScript types
console.log('\n🔧 Generating TypeScript types...')
try {
  execSync('npm run db:generate-types', { stdio: 'inherit' })
  console.log('✅ TypeScript types generated')
} catch (error) {
  console.warn('⚠️  Could not generate TypeScript types automatically')
  console.warn('   Run: npm run db:generate-types')
}

// Verify setup
console.log('\n🔍 Verifying database setup...')
try {
  // Check if tables exist
  const { stdout } = execSync('psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\\dt" -t', { encoding: 'utf8' })
  const tables = stdout.trim().split('\n').filter(line => line.trim())
  
  const expectedTables = ['ides', 'doc_chunks', 'users', 'user_prompts', 'chat_history', 'admin_logs']
  const foundTables = tables.map(line => line.split('|')[0].trim()).filter(name => name)
  
  console.log(`📊 Found ${foundTables.length} tables:`)
  foundTables.forEach(table => console.log(`  - ${table}`))
  
  const missingTables = expectedTables.filter(table => !foundTables.includes(table))
  if (missingTables.length > 0) {
    console.warn(`⚠️  Missing tables: ${missingTables.join(', ')}`)
  }
  
  // Check if pgvector extension is installed
  try {
    const vectorCheck = execSync('psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT 1 FROM pg_extension WHERE extname = \\'vector\\';" -t', { encoding: 'utf8' })
    if (vectorCheck.trim()) {
      console.log('✅ pgvector extension is installed')
    } else {
      console.warn('⚠️  pgvector extension not found')
    }
  } catch (error) {
    console.warn('⚠️  Could not verify pgvector extension')
  }
  
  // Check seed data
  try {
    const seedCheck = execSync('psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT COUNT(*) FROM ides;" -t', { encoding: 'utf8' })
    const ideCount = parseInt(seedCheck.trim())
    console.log(`🌱 Seed data: ${ideCount} IDEs found`)
    
    if (ideCount === 0) {
      console.warn('⚠️  No seed data found. You may need to run seed migration manually.')
    }
  } catch (error) {
    console.warn('⚠️  Could not verify seed data')
  }
  
} catch (error) {
  console.warn('⚠️  Could not verify database setup completely')
  console.warn(`   Error: ${error.message}`)
}

console.log('\n🎉 Database setup complete!')
console.log('\n📋 Next steps:')
console.log('1. Copy .env.example to .env.local and configure your Supabase credentials')
console.log('2. Run: npm install')
console.log('3. Start your development server: npm run dev')
console.log('\n📚 For more information, see README.md')