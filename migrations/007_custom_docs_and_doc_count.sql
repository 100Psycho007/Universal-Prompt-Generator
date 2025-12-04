-- Migration: Custom Documentation Support & Doc Count
-- Description: Add support for user-uploaded custom documentation and doc count tracking

-- Add is_custom flag and doc count to ides table
ALTER TABLE ides ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE ides ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
ALTER TABLE ides ADD COLUMN IF NOT EXISTS doc_count INTEGER DEFAULT 0;
ALTER TABLE ides ADD COLUMN IF NOT EXISTS last_ingested_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ides_is_custom ON ides(is_custom);
CREATE INDEX IF NOT EXISTS idx_ides_uploaded_by ON ides(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ides_last_ingested_at ON ides(last_ingested_at);

-- Update existing records with current doc counts
UPDATE ides 
SET doc_count = (
  SELECT COUNT(*) 
  FROM doc_chunks 
  WHERE doc_chunks.ide_id = ides.id
)
WHERE doc_count = 0;

-- Update RLS policies to allow users to see their own custom docs
CREATE POLICY "Users can view their own custom docs"
  ON ides
  FOR SELECT
  USING (
    is_custom = FALSE OR 
    uploaded_by = auth.uid()
  );

CREATE POLICY "Users can insert their own custom docs"
  ON ides
  FOR INSERT
  WITH CHECK (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update their own custom docs"
  ON ides
  FOR UPDATE
  USING (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete their own custom docs"
  ON ides
  FOR DELETE
  USING (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

-- Add comments
COMMENT ON COLUMN ides.is_custom IS 'Whether this is user-uploaded custom documentation';
COMMENT ON COLUMN ides.uploaded_by IS 'User who uploaded this custom documentation';
COMMENT ON COLUMN ides.doc_count IS 'Number of documentation chunks for this IDE';
COMMENT ON COLUMN ides.last_ingested_at IS 'Last time documentation was ingested';
