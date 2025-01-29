import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { openai } from '@/lib';
import { ThreadStatus } from '@/types';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';

// Validation schemas
const ToolSchema = z.object({
  type: z.enum(['code_interpreter', 'retrieval', 'function']),
  function: z.object({
    name: z.string(),
    parameters: z.record(z.any())
  }).optional()
});

const RequestSchema = z.object({
  message: z.string().min(1),
  threadId: z.string(),
  files: z.array(z.instanceof(File)).optional(),
  tools: z.array(ToolSchema).optional()
});

type Tool = z.infer<typeof ToolSchema>;

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  file_ids?: string[];
}

// File validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

// Rate limiting
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
});

async function validateFiles(files: File[]): Promise<string | null> {
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} exceeds maximum size of 5MB`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type ${file.type} not allowed`;
    }
  }
  return null;
}

async function uploadFiles(
  files: File[], 
  threadId: string, 
  tools: z.infer<typeof ToolSchema>[], 
  supabase: any
): Promise<AssistantMessage[]> {
  const attachments: AssistantMessage[] = [];

  try {
    for (const file of files) {
      const openaiFile = await openai.files.create({
        file,
        purpose: 'assistants'
      });

      await supabase
        .from('chat_files')
        .insert({
          thread_id: threadId,
          file_id: openaiFile.id,
          filename: file.name,
          purpose: 'assistants',
          bytes: file.size,
          metadata: {
            content_type: file.type,
            tools
          }
        });

      attachments.push({
        role: 'assistant',
        content: `Uploaded file: ${file.name}`,
        file_ids: [openaiFile.id]
      });
    }
    return attachments;
  } catch (error) {
    // Cleanup on failure
    await Promise.all(
      attachments.map(async (attachment) => {
        try {
          await openai.files.del(attachment.file_ids[0]);
        } catch (e) {
          console.error('Error cleaning up file:', attachment.file_ids[0], e);
        }
      })
    );
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }

  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const formData = await req.formData();
    const rawData = {
      message: formData.get('message'),
      threadId: formData.get('threadId'),
      files: formData.getAll('files'),
      tools: JSON.parse(formData.get('tools') as string || '[]')
    };

    // Validate request data
    const validatedData = await RequestSchema.parseAsync(rawData).catch(error => {
      throw new Error(`Invalid request data: ${error.message}`);
    });

    // Validate files if present
    if (validatedData.files?.length) {
      const fileError = await validateFiles(validatedData.files);
      if (fileError) {
        throw new Error(fileError);
      }
    }

    // Get thread and verify access
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select()
      .eq('id', validatedData.threadId)
      .eq('user_id', session.user.id)
      .single();

    if (threadError || !thread) {
      throw new Error('Thread not found or access denied');
    }

    // Upload files and create attachments if any
    const attachments = validatedData.files?.length 
      ? await uploadFiles(
          validatedData.files, 
          thread.id, 
          validatedData.tools || [], 
          supabase
        )
      : [];

    // Send message to OpenAI
    const fileIds = attachments.map(a => a.file_ids[0]);
    const message: AssistantMessage = {
      role: 'user',
      content: validatedData.message,
      ...(fileIds.length > 0 && { file_ids: fileIds })
    };

    const openaiMessage = await openai.beta.threads.messages.create(
      thread.metadata.openai_thread_id,
      message as any // Type assertion needed until OpenAI types are updated
    );

    // Save message to Supabase
    const { data: savedMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: thread.id,
        role: 'user',
        content: validatedData.message,
        metadata: {
          openai_message_id: openaiMessage.id,
          file_ids: fileIds
        }
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Create run with tools
    const run = await openai.beta.threads.runs.create(
      thread.metadata.openai_thread_id,
      { 
        assistant_id: thread.assistant_id,
        ...(validatedData.tools?.length && { tools: validatedData.tools })
      }
    );

    // Update thread status
    await supabase
      .from('chat_threads')
      .update({
        status: 'in_progress' as ThreadStatus,
        metadata: {
          ...thread.metadata,
          current_run_id: run.id
        }
      })
      .eq('id', thread.id);

    return new Response(
      JSON.stringify({
        message: savedMessage,
        run_id: run.id
      }), 
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    );
  } catch (error) {
    console.error('API Error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';
      
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: error instanceof Error && error.message.includes('not found') ? 404 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');
    
    if (!threadId) {
      return new Response('Missing thread ID', { status: 400 });
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({ messages }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('API Error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';
      
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
