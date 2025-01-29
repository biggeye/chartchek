-- Add title column to chat_threads if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chat_threads' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE chat_threads
        ADD COLUMN title TEXT;
    END IF;
END $$;
