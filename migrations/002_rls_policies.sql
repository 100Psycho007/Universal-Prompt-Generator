-- Enable Row Level Security on user tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User prompts table policies
-- Users can view their own prompts
CREATE POLICY "Users can view own prompts" ON user_prompts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own prompts
CREATE POLICY "Users can create own prompts" ON user_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own prompts
CREATE POLICY "Users can update own prompts" ON user_prompts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own prompts
CREATE POLICY "Users can delete own prompts" ON user_prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Chat history table policies
-- Users can view their own chat history
CREATE POLICY "Users can view own chat history" ON chat_history
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own chat history
CREATE POLICY "Users can create own chat history" ON chat_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own chat history
CREATE POLICY "Users can update own chat history" ON chat_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own chat history
CREATE POLICY "Users can delete own chat history" ON chat_history
    FOR DELETE USING (auth.uid() = user_id);

-- IDEs table - read access for authenticated users
ALTER TABLE ides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view IDEs" ON ides
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view doc_chunks" ON doc_chunks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin logs table - service role only
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin logs" ON admin_logs
    FOR ALL USING (auth.role() = 'service_role');