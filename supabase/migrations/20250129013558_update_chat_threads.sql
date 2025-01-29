-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create thread status enum FIRST
DROP TYPE IF EXISTS thread_status CASCADE;
CREATE TYPE thread_status AS ENUM (
  'queued',
  'in_progress',
  'requires_action',
  'cancelling',
  'cancelled',
  'failed',
  'completed',
  'expired'
);

-- First remove all dependent policies and constraints
DROP POLICY IF EXISTS "Users can view messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can view files in their threads" ON chat_files;
DROP POLICY IF EXISTS "Users can insert files in their threads" ON chat_files;
DROP POLICY IF EXISTS "Users can view their own threads" ON chat_threads;
DROP POLICY IF EXISTS "Users can insert their own threads" ON chat_threads;
DROP POLICY IF EXISTS "Users can update their own threads" ON chat_threads;
DROP POLICY IF EXISTS "Users can delete their own threads" ON chat_threads;

-- Remove dependent foreign keys
ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_thread_id_fkey;

ALTER TABLE chat_files
  DROP CONSTRAINT IF EXISTS chat_files_thread_id_fkey;

-- Create temporary tables to store existing data
CREATE TEMPORARY TABLE temp_messages AS SELECT * FROM chat_messages;
CREATE TEMPORARY TABLE temp_files AS SELECT * FROM chat_files;

-- Create a mapping table for old to new IDs
CREATE TABLE thread_id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL
);

-- Now we can safely modify chat_threads
ALTER TABLE chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_pkey;

-- Create new table with enum type already set
CREATE TABLE chat_threads_new (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  assistant_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status thread_status DEFAULT 'queued'::thread_status,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert data into new table and save mapping
WITH inserted AS (
  INSERT INTO chat_threads_new (
    id,
    user_id,
    assistant_id,
    metadata,
    status,
    created_at,
    updated_at
  )
  SELECT 
    uuid_generate_v4() as new_id,
    user_id,
    assistant_id,
    COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('openai_thread_id', thread_id),
    CASE status
      WHEN 'queued' THEN 'queued'::thread_status
      WHEN 'in_progress' THEN 'in_progress'::thread_status
      WHEN 'requires_action' THEN 'requires_action'::thread_status
      WHEN 'cancelling' THEN 'cancelling'::thread_status
      WHEN 'cancelled' THEN 'cancelled'::thread_status
      WHEN 'failed' THEN 'failed'::thread_status
      WHEN 'completed' THEN 'completed'::thread_status
      WHEN 'expired' THEN 'expired'::thread_status
      ELSE 'queued'::thread_status
    END,
    created_at,
    updated_at
  FROM chat_threads
  RETURNING id, metadata->>'openai_thread_id' as old_id
)
INSERT INTO thread_id_mapping (old_id, new_id)
SELECT old_id, id FROM inserted;

-- Drop existing tables
DROP TABLE chat_messages;
DROP TABLE chat_files;
DROP TABLE chat_threads;

-- Recreate chat_messages with correct structure
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate chat_files with correct structure
CREATE TABLE chat_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID NOT NULL,
  file_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  purpose TEXT CHECK (purpose IN ('assistants', 'assistants_output')) NOT NULL,
  bytes INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rename threads table
ALTER TABLE chat_threads_new RENAME TO chat_threads;

-- Now reinsert the data with new IDs
INSERT INTO chat_messages (id, thread_id, role, content, created_at)
SELECT 
  m.id,
  tm.new_id,
  m.role,
  m.content,
  m.created_at
FROM temp_messages m
JOIN thread_id_mapping tm ON m.thread_id::text = tm.old_id;

INSERT INTO chat_files (id, thread_id, file_id, filename, purpose, bytes, metadata, created_at)
SELECT 
  f.id,
  tm.new_id,
  f.file_id,
  f.filename,
  f.purpose,
  f.bytes,
  f.metadata,
  f.created_at
FROM temp_files f
JOIN thread_id_mapping tm ON f.thread_id::text = tm.old_id;

-- Add foreign key constraints
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_thread_id_fkey
  FOREIGN KEY (thread_id)
  REFERENCES chat_threads(id)
  ON DELETE CASCADE;

ALTER TABLE chat_files
  ADD CONSTRAINT chat_files_thread_id_fkey
  FOREIGN KEY (thread_id)
  REFERENCES chat_threads(id)
  ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_assistant_id ON chat_threads(assistant_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON chat_threads(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_thread_id ON chat_files(thread_id);

-- Re-enable RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view their own threads"
  ON chat_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own threads"
  ON chat_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON chat_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON chat_threads FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their threads"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND chat_threads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their threads"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND chat_threads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view files in their threads"
  ON chat_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_files.thread_id
      AND chat_threads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files in their threads"
  ON chat_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_files.thread_id
      AND chat_threads.user_id = auth.uid()
    )
  );

-- Clean up
DROP TABLE thread_id_mapping;
DROP TABLE temp_messages;
DROP TABLE temp_files;