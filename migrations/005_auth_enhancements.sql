-- Migration 005: Auth Enhancements
-- Add authentication and tracking fields to existing tables

-- Add role and guest flag to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_guest') THEN
        ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add created_by and updated_by to ides table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ides' AND column_name='created_by') THEN
        ALTER TABLE ides ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ides' AND column_name='updated_by') THEN
        ALTER TABLE ides ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ides' AND column_name='last_ingested_at') THEN
        ALTER TABLE ides ADD COLUMN last_ingested_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ides' AND column_name='doc_count') THEN
        ALTER TABLE ides ADD COLUMN doc_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create ingest_status table (if not exists)
CREATE TABLE IF NOT EXISTS ingest_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ide_id UUID NOT NULL REFERENCES ides(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    chunks_processed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_usage_stats table (if not exists)
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ingest_status
CREATE INDEX IF NOT EXISTS idx_ingest_status_ide_id ON ingest_status(ide_id);
CREATE INDEX IF NOT EXISTS idx_ingest_status_status ON ingest_status(status);
CREATE INDEX IF NOT EXISTS idx_ingest_status_created_at ON ingest_status(created_at);

-- Create indexes for api_usage_stats
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON api_usage_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_created_at ON api_usage_stats(created_at);

-- Enable RLS on new tables
ALTER TABLE ingest_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingest_status (admin only)
CREATE POLICY "Admins can view ingest status" ON ingest_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage ingest status" ON ingest_status
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for api_usage_stats (admin only)
CREATE POLICY "Admins can view api usage stats" ON api_usage_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage api usage stats" ON api_usage_stats
    FOR ALL USING (auth.role() = 'service_role');

-- Update trigger for ingest_status
CREATE TRIGGER update_ingest_status_updated_at 
    BEFORE UPDATE ON ingest_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
