-- Migration: Custom Documentation Support
-- Description: Add support for user-uploaded custom documentation

-- Add is_custom flag to ides table
ALTER TABLE ides ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE ides ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Create index for custom docs
CREATE INDEX IF NOT EXISTS idx_ides_is_custom ON ides(is_custom);
CREATE INDEX IF NOT EXISTS idx_ides_uploaded_by ON ides(uploaded_by);

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

-- Add comment
COMMENT ON COLUMN ides.is_custom IS 'Whether this is user-uploaded custom documentation';
COMMENT ON COLUMN ides.uploaded_by IS 'User who uploaded this custom documentation';
