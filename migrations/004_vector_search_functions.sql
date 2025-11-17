-- Create vector search function for pgvector
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  ide_filter uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  ide_id uuid,
  text text,
  embedding vector(1536),
  source_url text,
  section text,
  version text,
  created_at timestamptz,
  similarity float,
  ide_name text,
  ide_docs_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    doc_chunks.id,
    doc_chunks.ide_id,
    doc_chunks.text,
    doc_chunks.embedding,
    doc_chunks.source_url,
    doc_chunks.section,
    doc_chunks.version,
    doc_chunks.created_at,
    1 - (doc_chunks.embedding <=> query_embedding) as similarity,
    ides.name as ide_name,
    ides.docs_url as ide_docs_url
  FROM doc_chunks
  LEFT JOIN ides ON doc_chunks.ide_id = ides.id
  WHERE 
    1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
    AND (ide_filter IS NULL OR doc_chunks.ide_id = ide_filter)
  ORDER BY 
    1 - (doc_chunks.embedding <=> query_embedding) DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for updating doc chunk embeddings
CREATE OR REPLACE FUNCTION update_doc_chunk_embedding(
  chunk_id uuid,
  new_embedding vector(1536)
)
RETURNS boolean AS $$
BEGIN
  UPDATE doc_chunks 
  SET embedding = new_embedding 
  WHERE id = chunk_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function for bulk embedding updates
CREATE OR REPLACE FUNCTION bulk_update_embeddings(
  chunks text[],
  embeddings vector(1536)[]
)
RETURNS int AS $$
DECLARE
  updated_count int := 0;
  i int;
BEGIN
  FOR i IN 1..array_length(chunks, 1) LOOP
    UPDATE doc_chunks 
    SET embedding = embeddings[i]
    WHERE text = chunks[i];
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for getting IDE statistics
CREATE OR REPLACE FUNCTION get_ide_statistics(ide_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  ide_id uuid,
  ide_name text,
  doc_chunk_count bigint,
  avg_embedding_length float,
  last_updated timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ides.id,
    ides.name,
    COUNT(doc_chunks.id) as doc_chunk_count,
    AVG(array_length(embedding, 1)) as avg_embedding_length,
    MAX(doc_chunks.created_at) as last_updated
  FROM ides
  LEFT JOIN doc_chunks ON ides.id = doc_chunks.ide_id
  WHERE 
    ide_id_param IS NULL OR ides.id = ide_id_param
  GROUP BY 
    ides.id, ides.name
  ORDER BY 
    ides.name;
END;
$$ LANGUAGE plpgsql;

-- Create function for user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  user_id_param uuid,
  days_back int DEFAULT 30
)
RETURNS TABLE(
  prompts_count bigint,
  chats_count bigint,
  last_activity timestamptz,
  most_used_ide text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_prompts WHERE user_id = user_id_param AND created_at >= NOW() - INTERVAL '1 day' * days_back) as prompts_count,
    (SELECT COUNT(*) FROM chat_history WHERE user_id = user_id_param AND updated_at >= NOW() - INTERVAL '1 day' * days_back) as chats_count,
    GREATEST(
      (SELECT MAX(created_at) FROM user_prompts WHERE user_id = user_id_param),
      (SELECT MAX(updated_at) FROM chat_history WHERE user_id = user_id_param)
    ) as last_activity,
    (
      SELECT ides.name 
      FROM user_prompts 
      JOIN ides ON user_prompts.ide_id = ides.id 
      WHERE user_prompts.user_id = user_id_param 
      GROUP BY ides.name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_used_ide;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION vector_search TO authenticated;
GRANT EXECUTE ON FUNCTION get_ide_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;

-- Grant execute permissions to service role for admin functions
GRANT EXECUTE ON FUNCTION update_doc_chunk_embedding TO service_role;
GRANT EXECUTE ON FUNCTION bulk_update_embeddings TO service_role;