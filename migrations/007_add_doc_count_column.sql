-- Add doc_count and last_ingested_at columns to ides table
ALTER TABLE ides 
ADD COLUMN IF NOT EXISTS doc_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ingested_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ides_last_ingested_at ON ides(last_ingested_at);

-- Update existing records with current doc counts
UPDATE ides 
SET doc_count = (
  SELECT COUNT(*) 
  FROM doc_chunks 
  WHERE doc_chunks.ide_id = ides.id
)
WHERE doc_count = 0;
