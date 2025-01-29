-- Enable realtime for chat tables
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table chat_threads;
alter publication supabase_realtime add table chat_files;

-- Enable row level security for realtime
alter table chat_messages replica identity full;
alter table chat_threads replica identity full;
alter table chat_files replica identity full;
