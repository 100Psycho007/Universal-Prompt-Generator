-- Fix RLS Policies for Better Access Control
-- This fixes the 406 errors by ensuring proper RLS policies

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their own custom docs" ON ides;
DROP POLICY IF EXISTS "Users can insert their own custom docs" ON ides;
DROP POLICY IF EXISTS "Users can update their own custom docs" ON ides;
DROP POLICY IF EXISTS "Users can delete their own custom docs" ON ides;

-- Enable RLS on ides table
ALTER TABLE ides ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view public IDEs (is_custom = false)
CREATE POLICY "Anyone can view public IDEs"
  ON ides
  FOR SELECT
  USING (is_custom = FALSE OR is_custom IS NULL);

-- Allow authenticated users to view their own custom docs
CREATE POLICY "Users can view own custom docs"
  ON ides
  FOR SELECT
  USING (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

-- Allow authenticated users to insert custom docs
CREATE POLICY "Users can create custom docs"
  ON ides
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

-- Allow users to update their own custom docs
CREATE POLICY "Users can update own custom docs"
  ON ides
  FOR UPDATE
  USING (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  )
  WITH CHECK (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

-- Allow users to delete their own custom docs
CREATE POLICY "Users can delete own custom docs"
  ON ides
  FOR DELETE
  USING (
    is_custom = TRUE AND 
    uploaded_by = auth.uid()
  );

-- Fix doc_chunks RLS policies
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view doc chunks" ON doc_chunks;
DROP POLICY IF EXISTS "Users can view own doc chunks" ON doc_chunks;

-- Allow viewing doc chunks for public IDEs
CREATE POLICY "Anyone can view public doc chunks"
  ON doc_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ides 
      WHERE ides.id = doc_chunks.ide_id 
      AND (ides.is_custom = FALSE OR ides.is_custom IS NULL)
    )
  );

-- Allow viewing doc chunks for user's custom IDEs
CREATE POLICY "Users can view own custom doc chunks"
  ON doc_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ides 
      WHERE ides.id = doc_chunks.ide_id 
      AND ides.is_custom = TRUE 
      AND ides.uploaded_by = auth.uid()
    )
  );

-- Allow inserting doc chunks for custom IDEs
CREATE POLICY "Users can insert doc chunks for own custom docs"
  ON doc_chunks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ides 
      WHERE ides.id = doc_chunks.ide_id 
      AND ides.is_custom = TRUE 
      AND ides.uploaded_by = auth.uid()
    )
  );

-- Fix chat_history RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can insert own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can update own chat history" ON chat_history;

CREATE POLICY "Users can view own chats"
  ON chat_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own chats"
  ON chat_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chats"
  ON chat_history
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chats"
  ON chat_history
  FOR DELETE
  USING (user_id = auth.uid());
