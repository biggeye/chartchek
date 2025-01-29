-- Create tables
create table chat_threads (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) not null,
    assistant_id text not null,
    thread_id text not null,
    title text
);

create table chat_messages (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    thread_id uuid references chat_threads(id) not null,
    role text check (role in ('user', 'assistant', 'system')) not null,
    content text not null
);

create table user_assistants (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) not null,
    assistant_key text not null,
    assistant_id text not null,
    unique(user_id, assistant_key)
);

-- Create indexes
create index chat_threads_user_id_idx on chat_threads(user_id);
create index chat_messages_thread_id_idx on chat_messages(thread_id);
create index user_assistants_user_id_idx on user_assistants(user_id);
create index user_assistants_assistant_key_idx on user_assistants(assistant_key);

-- Enable RLS
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;
alter table user_assistants enable row level security;

-- Create RLS policies
create policy "Users can view their own chat threads"
    on chat_threads for select
    using (auth.uid() = user_id);

create policy "Users can insert their own chat threads"
    on chat_threads for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own chat threads"
    on chat_threads for update
    using (auth.uid() = user_id);

create policy "Users can view messages in their threads"
    on chat_messages for select
    using (
        exists (
            select 1 from chat_threads
            where chat_threads.id = chat_messages.thread_id
            and chat_threads.user_id = auth.uid()
        )
    );

create policy "Users can insert messages in their threads"
    on chat_messages for insert
    with check (
        exists (
            select 1 from chat_threads
            where chat_threads.id = chat_messages.thread_id
            and chat_threads.user_id = auth.uid()
        )
    );

create policy "Users can view their assistant mappings"
    on user_assistants for select
    using (auth.uid() = user_id);

create policy "Users can create their assistant mappings"
    on user_assistants for insert
    with check (auth.uid() = user_id);

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger update_chat_threads_updated_at
    before update on chat_threads
    for each row
    execute function update_updated_at_column();
