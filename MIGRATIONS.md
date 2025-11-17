# Database Migrations

This document explains the database migration system for the Universal IDE platform.

## Migration Files

### 001_initial_schema.sql
- Creates all core database tables
- Enables required extensions (uuid-ossp, vector)
- Sets up indexes for performance
- Creates triggers for updated_at columns

**Tables created:**
- `ides` - IDE information and metadata
- `doc_chunks` - Documentation chunks with vector embeddings
- `users` - User profiles (managed by Supabase Auth)
- `user_prompts` - User-generated prompts and AI responses
- `chat_history` - Chat conversation history
- `admin_logs` - Administrative action logs

### 002_rls_policies.sql
- Enables Row Level Security (RLS) on user tables
- Creates security policies for data access
- Ensures users can only access their own data
- Provides read access for authenticated users to IDE data

**Security policies:**
- Users can view/update their own profiles
- Users can manage their own prompts and chat history
- Authenticated users can read IDE and documentation data
- Service role only for admin operations

### 003_seed_data.sql
- Populates initial IDE data
- Includes popular IDEs and AI coding assistants
- Sets up manifest information for each IDE

**Seed data includes:**
- Cursor, Windsurf, Kiro, Continue.dev
- GitHub Copilot, Tabnine, Replit Ghostwriter
- Amazon CodeWhisperer, CodeT5, StarCoder

### 004_vector_search_functions.sql
- Creates vector search functions for pgvector
- Adds utility functions for embedding management
- Implements analytics and reporting functions
- Sets up database health check functions

**Functions created:**
- `vector_search()` - Semantic search using embeddings
- `update_doc_chunk_embedding()` - Update individual embeddings
- `bulk_update_embeddings()` - Batch embedding updates
- `get_ide_statistics()` - IDE usage statistics
- `get_user_activity_summary()` - User activity reports

## Running Migrations

### Automatic Setup
```bash
# Run the automated setup script
node scripts/setup-database.js
```

### Manual Setup
```bash
# Start Supabase (if not running)
supabase start

# Apply all migrations
supabase db push

# Generate TypeScript types
npm run db:generate-types
```

### Individual Migration Execution
```bash
# Apply specific migration file
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f migrations/001_initial_schema.sql

# Or using Supabase CLI
supabase db push --db-url "postgresql://postgres:postgres@localhost:54322/postgres"
```

## Verification

After running migrations, you can verify the setup:

```sql
-- Check tables
\dt

-- Check extensions
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('doc_chunks', 'user_prompts', 'chat_history');

-- Check seed data
SELECT COUNT(*) FROM ides;
SELECT name FROM ides ORDER BY name;

-- Check RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies;
```

## Vector Search Setup

The vector search functionality requires:

1. **pgvector extension** - Enabled in 001_initial_schema.sql
2. **Embedding vectors** - 1536 dimensions (OpenAI compatible)
3. **Vector index** - IVFFlat index for efficient similarity search

### Testing Vector Search
```sql
-- Test vector search function
SELECT * FROM vector_search(
  '[0.1,0.2,0.3]'::vector, -- Replace with actual embedding
  0.7, -- similarity threshold
  10,  -- result limit
  NULL -- IDE filter (optional)
);
```

## Schema Updates

When modifying the database schema:

1. Create a new migration file with the next number (005_...)
2. Write your SQL changes
3. Update TypeScript types in `/types/database.ts`
4. Test the migration
5. Update documentation

### Example New Migration
```sql
-- 005_add_new_feature.sql
ALTER TABLE user_prompts ADD COLUMN tags TEXT[];
CREATE INDEX idx_user_prompts_tags ON user_prompts USING GIN(tags);
```

## Rollback Procedures

If you need to rollback changes:

```bash
# Reset entire database (destructive!)
supabase db reset

# Or manually rollback specific changes
# Create rollback migration file and apply it
```

## Performance Considerations

- Vector indexes are configured for 100 lists (adjust based on data size)
- Regular ANALYZE operations recommended for query optimization
- Consider connection pooling for high-traffic applications
- Monitor query performance and adjust indexes as needed

## Security Notes

- All user tables have RLS enabled
- Service role key required for admin operations
- Never expose service role key to client-side code
- Regular security audits recommended

## Troubleshooting

### Common Issues

1. **Vector extension not found**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```

2. **RLS policies not working**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

3. **TypeScript types out of date**
   ```bash
   npm run db:generate-types
   ```

4. **Migration fails**
   - Check PostgreSQL version compatibility
   - Verify extension permissions
   - Check for syntax errors in SQL

### Debug Commands
```sql
-- Check current migrations
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Check table structures
\d table_name

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

## Best Practices

1. Always test migrations on development first
2. Use descriptive migration names
3. Include rollback procedures in documentation
4. Keep migrations small and focused
5. Update TypeScript types after schema changes
6. Document breaking changes
7. Regular backup before major changes