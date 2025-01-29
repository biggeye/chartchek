import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { openai } from '@/lib';
import { ThreadStatus } from '@/types';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, rateLimit } from '@/lib/redis';
import { headers } from 'next/headers';
import { Database } from '@/types/database';
import { assistantRoster } from '@/lib/assistantRoster';
import type { AssistantTool } from 'openai/resources/beta/assistants';

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

// Assistant ID mapping from roster
const ASSISTANT_KEYS = assistantRoster.map(a => a.key);
type AssistantKey = (typeof ASSISTANT_KEYS)[number];

// Request validation schema
const RequestSchema = z.object({
  message: z.string(),
  threadId: z.string().optional(),
  assistantKey: z.enum(ASSISTANT_KEYS as [string, ...string[]]),
  model: z.string(),
  files: z.array(z.instanceof(File)).optional()
});

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  file_ids?: string[];
}

interface ThreadMetadata {
  openai_thread_id: string;
  current_run_id: string | null;
}

interface MessageMetadata {
  file_ids?: string[];
}

type ChatThread = Database['public']['Tables']['chat_threads']['Row'] & {
  metadata: ThreadMetadata;
};

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'] & {
  metadata: MessageMetadata;
};

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

async function uploadFiles(files: File[], threadId: string, supabase: any) {
  const uploadedFiles: string[] = [];

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
            content_type: file.type
          }
        });

      uploadedFiles.push(openaiFile.id);
    }
    return uploadedFiles;
  } catch (error) {
    // Cleanup on failure
    await Promise.all(
      uploadedFiles.map(async (fileId) => {
        try {
          await openai.files.del(fileId);
        } catch (e) {
          console.error('Error cleaning up file:', fileId, e);
        }
      })
    );
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Use getUser instead of getSession for better security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limiting (optional)
    try {
      const { success } = await rateLimit(`chat:${user.id}`, 100, 3600)
      if (!success) {
        return new Response('Rate limit exceeded', { status: 429 })
      }
    } catch (error) {
      // If rate limiting fails, continue without it
      console.warn('[Redis] Rate limiting error:', error)
    }

    const formData = await req.formData();
    console.log('Received form data:', Object.fromEntries(formData.entries()));
    
    const rawData = {
      message: formData.get('message')?.toString() || '',
      threadId: formData.get('threadId')?.toString(),
      assistantKey: formData.get('assistantKey')?.toString() || 'tjc',
      model: formData.get('model')?.toString() || 'gpt-4o',
      files: Array.from(formData.getAll('files')) as File[]
    };

    console.log('Parsed raw data:', rawData);

    // Validate request data
    const validatedData = await RequestSchema.parseAsync(rawData).catch((error: z.ZodError) => {
      console.error('Validation error:', error);
      throw new Error(`Invalid request data: ${error.message}`);
    });

    // Get assistant ID and verify it exists
    const assistantConfig = assistantRoster.find(a => a.key === validatedData.assistantKey);
    if (!assistantConfig) {
      throw new Error(`Assistant configuration not found for key: ${validatedData.assistantKey}`);
    }

    // Create assistant if it doesn't exist
    let assistant;
    try {
      assistant = await openai.beta.assistants.create({
        name: assistantConfig.name,
        instructions: assistantConfig.instructions,
        model: validatedData.model,
        tools: [{ type: 'file_search' }] as AssistantTool[]
      });
      console.log('Created new assistant:', assistant.id);
    } catch (error: any) {
      console.error('Error creating assistant:', error);
      throw new Error(`Failed to create assistant: ${error.message}`);
    }

    // Validate files if present
    if (validatedData.files?.length) {
      const fileError = await validateFiles(validatedData.files);
      if (fileError) {
        throw new Error(fileError);
      }
    }

    // Get or create thread
    let thread: ChatThread;
    if (validatedData.threadId) {
      const { data, error: threadError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', validatedData.threadId)
        .eq('user_id', user.id)
        .single();

      if (threadError) {
        console.error('Thread fetch error:', threadError);
        throw new Error(threadError.message);
      }
      if (!data || !data.metadata?.openai_thread_id) {
        throw new Error('Thread not found or invalid metadata');
      }
      thread = data as ChatThread;
    } else {
      try {
        // Create new OpenAI thread
        const openaiThread = await openai.beta.threads.create();
        
        const threadMetadata: ThreadMetadata = {
          openai_thread_id: openaiThread.id,
          current_run_id: null
        };

        // Create new thread in database
        const { data: newThread, error: createError } = await supabase
          .from('chat_threads')
          .insert({
            user_id: user.id,
            title: validatedData.message || 'New Chat',
            assistant_id: assistant.id,
            status: 'queued' as ThreadStatus,
            metadata: threadMetadata
          })
          .select('*')
          .single();

        if (createError) {
          console.error('Thread creation error:', createError);
          throw createError;
        }
        if (!newThread) {
          throw new Error('Failed to create thread');
        }
        thread = { ...newThread, metadata: threadMetadata };
      } catch (error) {
        console.error('Thread creation error:', error);
        throw error;
      }
    }

    // Upload files if any
    const fileIds = validatedData.files?.length 
      ? await uploadFiles(validatedData.files, thread.id, supabase)
      : [];

    // Send message to OpenAI
    const message: AssistantMessage = {
      role: 'user',
      content: validatedData.message,
      ...(fileIds.length && { file_ids: fileIds })
    };

    await openai.beta.threads.messages.create(
      thread.metadata.openai_thread_id,
      message
    );

    // Create message stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Save user message first
          const { data: userMessage, error: userMsgError } = await supabase
            .from('chat_messages')
            .insert({
              thread_id: thread.id,
              role: 'user',
              content: validatedData.message,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (userMsgError) throw userMsgError;

          // Wait for the run to complete
          while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(
              thread.metadata.openai_thread_id,
              thread.metadata.current_run_id
            );

            if (runStatus.status === 'completed') {
              // Get the final messages
              const finalMessages = await openai.beta.threads.messages.list(
                thread.metadata.openai_thread_id
              );
              
              const lastMessage = finalMessages.data[0];
              if (lastMessage?.content?.[0]?.type === 'text') {
                const content = lastMessage.content[0].text.value;

                // Save assistant message
                const { error: assistantMsgError } = await supabase
                  .from('chat_messages')
                  .insert({
                    thread_id: thread.id,
                    role: 'assistant',
                    content: content,
                    created_at: new Date().toISOString()
                  });

                if (assistantMsgError) throw assistantMsgError;

                // Send final message
                controller.enqueue(
                  `data: ${JSON.stringify({
                    type: 'text',
                    value: { text: content }
                  })}\n\n`
                );
              }
              
              controller.close();
              break;
            } else if (runStatus.status === 'failed') {
              throw new Error('Assistant run failed');
            }

            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
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
