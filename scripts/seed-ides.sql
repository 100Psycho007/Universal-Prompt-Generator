-- Quick SQL script to add default IDEs
-- Run this in your Supabase SQL Editor

-- Make sure uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default IDEs
INSERT INTO ides (name, docs_url, status, manifest) VALUES
  ('Cursor', 'https://docs.cursor.com', 'active', '{"name": "Cursor", "version": "1.0.0", "description": "AI-powered code editor built on VS Code", "features": ["AI completion", "Chat with codebase", "Code generation", "Multi-file editing"]}'),
  ('GitHub Copilot', 'https://docs.github.com/copilot', 'active', '{"name": "GitHub Copilot", "version": "1.0.0", "description": "AI pair programmer from GitHub", "features": ["Code suggestions", "Chat", "Code explanation"]}'),
  ('Windsurf', 'https://docs.codeium.com/windsurf', 'active', '{"name": "Windsurf", "version": "1.0.0", "description": "Agentic IDE by Codeium", "features": ["Cascade AI", "Supercomplete", "Multi-file editing"]}'),
  ('Replit Agent', 'https://docs.replit.com/replitai/agent', 'active', '{"name": "Replit Agent", "version": "1.0.0", "description": "AI agent that builds complete applications", "features": ["Full-stack development", "Deployment", "Debugging"]}'),
  ('Bolt.new', 'https://bolt.new', 'active', '{"name": "Bolt.new", "version": "1.0.0", "description": "AI-powered full-stack web development", "features": ["Instant deployment", "Full-stack apps", "Real-time preview"]}')
ON CONFLICT (name) DO NOTHING;

-- Show results
SELECT name, status, created_at FROM ides ORDER BY created_at DESC;
