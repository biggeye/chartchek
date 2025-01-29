-- Create documents table
create table documents (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) not null,
    filename text not null,
    file_type text not null,
    facility text not null,
    category text not null,
    file_id text not null,
    size_bytes bigint not null,
    metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table documents enable row level security;

-- Create RLS policies
create policy "Users can view their own documents"
    on documents for select
    using (auth.uid() = user_id);

create policy "Users can create their own documents"
    on documents for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own documents"
    on documents for update
    using (auth.uid() = user_id);

create policy "Users can delete their own documents"
    on documents for delete
    using (auth.uid() = user_id);

-- Create indexes
create index documents_user_id_idx on documents(user_id);
create index documents_facility_idx on documents(facility);
create index documents_category_idx on documents(category);
create index documents_file_type_idx on documents(file_type);

-- Create trigger for updated_at
create trigger update_documents_updated_at
    before update on documents
    for each row
    execute function update_updated_at_column();
