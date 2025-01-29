-- Add new columns to chat_threads
alter table chat_threads
add column status text check (status in ('queued', 'in_progress', 'requires_action', 'cancelling', 'cancelled', 'failed', 'completed', 'expired')) default 'completed',
add column current_run_id text,
add column metadata jsonb default '{}'::jsonb;

-- Create files table
create table chat_files (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    thread_id uuid references chat_threads(id) not null,
    file_id text not null, -- OpenAI file ID
    filename text not null,
    purpose text check (purpose in ('assistants', 'assistants_output')) not null,
    bytes integer,
    metadata jsonb default '{}'::jsonb
);

-- Enable RLS on files
alter table chat_files enable row level security;

-- Create RLS policies for files
create policy "Users can view files in their threads"
    on chat_files for select
    using (
        exists (
            select 1 from chat_threads
            where chat_threads.id = chat_files.thread_id
            and chat_threads.user_id = auth.uid()
        )
    );

create policy "Users can insert files in their threads"
    on chat_files for insert
    with check (
        exists (
            select 1 from chat_threads
            where chat_threads.id = chat_files.thread_id
            and chat_threads.user_id = auth.uid()
        )
    );

-- Add indexes
create index chat_files_thread_id_idx on chat_files(thread_id);
create index chat_threads_status_idx on chat_threads(status);
