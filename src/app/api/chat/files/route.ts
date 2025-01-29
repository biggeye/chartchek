import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { openai } from '@/lib'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const threadId = formData.get('threadId') as string

    if (!threadId) {
      return new Response('Missing thread ID', { status: 400 })
    }

    // Verify thread access
    const { data: thread } = await supabase
      .from('chat_threads')
      .select()
      .eq('id', threadId)
      .eq('user_id', session.user.id)
      .single()

    if (!thread) {
      return new Response('Thread not found or access denied', { status: 404 })
    }

    // Upload files
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        // Upload to OpenAI
        const openaiFile = await openai.files.create({
          file,
          purpose: 'assistants'
        })

        // Save file reference
        const { data: chatFile, error } = await supabase
          .from('chat_files')
          .insert({
            thread_id: threadId,
            file_id: openaiFile.id,
            filename: file.name,
            purpose: 'assistants',
            bytes: file.size
          })
          .select()
          .single()

        if (error) throw error

        return chatFile
      })
    )

    return new Response(JSON.stringify({ files: uploadedFiles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('[CHAT FILES API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')
    const threadId = searchParams.get('threadId')

    if (!fileId || !threadId) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Verify thread access
    const { data: thread } = await supabase
      .from('chat_threads')
      .select()
      .eq('id', threadId)
      .eq('user_id', session.user.id)
      .single()

    if (!thread) {
      return new Response('Thread not found or access denied', { status: 404 })
    }

    // Delete from OpenAI
    await openai.files.del(fileId)

    // Delete from database
    await supabase
      .from('chat_files')
      .delete()
      .eq('file_id', fileId)
      .eq('thread_id', threadId)

    return new Response(null, { status: 204 })

  } catch (error: unknown) {
    console.error('[CHAT FILES API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
