-- Migration 006: Cron Jobs Support
-- Adds tables and functions for automated maintenance tasks

-- Create archived_admin_logs table for log archival
CREATE TABLE IF NOT EXISTS archived_admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_id UUID NOT NULL,
    action TEXT NOT NULL,
    ide_id UUID REFERENCES ides(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    original_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for archived logs
CREATE INDEX IF NOT EXISTS idx_archived_admin_logs_original_id ON archived_admin_logs(original_id);
CREATE INDEX IF NOT EXISTS idx_archived_admin_logs_ide_id ON archived_admin_logs(ide_id);
CREATE INDEX IF NOT EXISTS idx_archived_admin_logs_original_timestamp ON archived_admin_logs(original_timestamp);
CREATE INDEX IF NOT EXISTS idx_archived_admin_logs_archived_at ON archived_admin_logs(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_admin_logs_action ON archived_admin_logs(action);

-- Create ingest_status table if it doesn't exist (for tracking crawl jobs)
CREATE TABLE IF NOT EXISTS ingest_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ide_id UUID NOT NULL REFERENCES ides(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    chunks_processed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ingest_status
CREATE INDEX IF NOT EXISTS idx_ingest_status_ide_id ON ingest_status(ide_id);
CREATE INDEX IF NOT EXISTS idx_ingest_status_status ON ingest_status(status);
CREATE INDEX IF NOT EXISTS idx_ingest_status_created_at ON ingest_status(created_at);

-- Add trigger for ingest_status updated_at
CREATE TRIGGER update_ingest_status_updated_at 
BEFORE UPDATE ON ingest_status 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create api_usage_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for api_usage_stats
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON api_usage_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_created_at ON api_usage_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_status_code ON api_usage_stats(status_code);

-- Function to find duplicate chunks (for cleanup cron)
CREATE OR REPLACE FUNCTION find_duplicate_chunks()
RETURNS TABLE (
    id UUID,
    ide_id UUID,
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT dc.id, dc.ide_id, dc.text, dc.created_at
    FROM doc_chunks dc
    INNER JOIN (
        SELECT 
            ide_id,
            MD5(text) as text_hash,
            COUNT(*) as count
        FROM doc_chunks
        GROUP BY ide_id, MD5(text)
        HAVING COUNT(*) > 1
    ) duplicates
    ON dc.ide_id = duplicates.ide_id 
    AND MD5(dc.text) = duplicates.text_hash
    ORDER BY dc.ide_id, MD5(dc.text), dc.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to vacuum doc_chunks table (for maintenance)
CREATE OR REPLACE FUNCTION vacuum_doc_chunks_table()
RETURNS void AS $$
BEGIN
    -- Note: VACUUM cannot be run inside a transaction block
    -- This function serves as a placeholder and needs to be called
    -- via a connection with autocommit enabled
    EXECUTE 'ANALYZE doc_chunks';
END;
$$ LANGUAGE plpgsql;

-- Function to vacuum archived_admin_logs table
CREATE OR REPLACE FUNCTION vacuum_archived_logs_table()
RETURNS void AS $$
BEGIN
    EXECUTE 'ANALYZE archived_admin_logs';
END;
$$ LANGUAGE plpgsql;

-- Add hash column to doc_chunks for faster duplicate detection (optional)
-- This is commented out as it would require recomputing hashes for existing data
-- Uncomment and run separately if needed:
-- ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS content_hash TEXT;
-- CREATE INDEX IF NOT EXISTS idx_doc_chunks_content_hash ON doc_chunks(content_hash);
-- UPDATE doc_chunks SET content_hash = MD5(text) WHERE content_hash IS NULL;

-- Grant necessary permissions (adjust based on your RLS policies)
-- These are examples and may need adjustment based on your setup

COMMENT ON TABLE archived_admin_logs IS 'Archived admin logs older than 30 days for long-term storage';
COMMENT ON TABLE ingest_status IS 'Tracks documentation ingestion/crawl job status';
COMMENT ON FUNCTION find_duplicate_chunks() IS 'Finds duplicate doc chunks for cleanup cron job';
COMMENT ON FUNCTION vacuum_doc_chunks_table() IS 'Runs ANALYZE on doc_chunks for performance optimization';
COMMENT ON FUNCTION vacuum_archived_logs_table() IS 'Runs ANALYZE on archived_admin_logs for performance optimization';
