-- Add metadata column to chat_messages if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE chat_messages
        ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add metadata index for better performance if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'chat_messages'
        AND indexname = 'chat_messages_metadata_idx'
    ) THEN
        CREATE INDEX chat_messages_metadata_idx ON chat_messages USING gin (metadata);
    END IF;
END $$;

-- Add updated_at column and trigger for chat_messages if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE chat_messages
        ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) not null;

        CREATE TRIGGER update_chat_messages_updated_at
            BEFORE UPDATE ON chat_messages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
