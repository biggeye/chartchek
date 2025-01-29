-- Create enums
CREATE TYPE vector_store_status AS ENUM (
  'processing',
  'ready',
  'failed'
);

CREATE TYPE document_processing_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Create base documents table first
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    facility TEXT NOT NULL,
    category TEXT NOT NULL,
    file_id TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    vector_store_id TEXT,
    processing_status document_processing_status DEFAULT 'pending',
    storage_path TEXT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create vector stores table
CREATE TABLE vector_stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    openai_vector_store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status vector_store_status NOT NULL DEFAULT 'processing',
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document vector stores mapping
CREATE TABLE document_vector_stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    vector_store_id UUID NOT NULL REFERENCES vector_stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, vector_store_id)
);

-- Create message annotations table
CREATE TABLE chat_message_annotations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('file_citation', 'file_path')) NOT NULL,
    text TEXT NOT NULL,
    file_id TEXT,
    quote TEXT,
    start_index INTEGER,
    end_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_facility ON documents(facility);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_vector_store_id ON documents(vector_store_id);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);

CREATE INDEX idx_vector_stores_user_id ON vector_stores(user_id);
CREATE INDEX idx_vector_stores_status ON vector_stores(status);

CREATE INDEX idx_document_vector_stores_document_id ON document_vector_stores(document_id);
CREATE INDEX idx_document_vector_stores_vector_store_id ON document_vector_stores(vector_store_id);

CREATE INDEX idx_chat_message_annotations_message_id ON chat_message_annotations(message_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_vector_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_annotations ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view their own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
    ON documents FOR DELETE
    USING (auth.uid() = user_id);

-- Vector stores policies
CREATE POLICY "Users can view their own vector stores"
    ON vector_stores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vector stores"
    ON vector_stores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vector stores"
    ON vector_stores FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vector stores"
    ON vector_stores FOR DELETE
    USING (auth.uid() = user_id);

-- Document vector stores policies
CREATE POLICY "Users can view their document vector stores"
    ON document_vector_stores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_vector_stores.document_id
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their document vector stores"
    ON document_vector_stores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_vector_stores.document_id
            AND documents.user_id = auth.uid()
        )
    );

-- Message annotations policies
CREATE POLICY "Users can view annotations in their threads"
    ON chat_message_annotations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_messages m
            JOIN chat_threads t ON t.id = m.thread_id
            WHERE m.id = chat_message_annotations.message_id
            AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert annotations in their threads"
    ON chat_message_annotations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_messages m
            JOIN chat_threads t ON t.id = m.thread_id
            WHERE m.id = chat_message_annotations.message_id
            AND t.user_id = auth.uid()
        )
    );

-- Create updated_at triggers
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_stores_updated_at
    BEFORE UPDATE ON vector_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
