import OpenAI from 'openai'
import type { AssistantCreateParams, AssistantUpdateParams } from 'openai/resources/beta/assistants'

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  organization: process.env.OPENAI_ORG_ID,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
})

// Assistant operations
export async function createAssistant(config: AssistantCreateParams) {
  return await openai.beta.assistants.create(config)
}

export async function updateAssistant(
  assistantId: string,
  config: Partial<AssistantUpdateParams>
) {
  return await openai.beta.assistants.update(assistantId, config)
}

export async function deleteAssistant(assistantId: string) {
  return await openai.beta.assistants.del(assistantId)
}

export async function listAssistants() {
  return await openai.beta.assistants.list()
}

export async function getAssistant(assistantId: string) {
  return await openai.beta.assistants.retrieve(assistantId)
}

// Assistant file operations
export async function createAssistantFile(assistantId: string, fileId: string) {
  return await openai.beta.assistants.files.create(assistantId, { file_id: fileId })
}

export async function deleteAssistantFile(assistantId: string, fileId: string) {
  return await openai.beta.assistants.files.del(assistantId, fileId)
}

export async function listAssistantFiles(assistantId: string) {
  return await openai.beta.assistants.files.list(assistantId)
}

// Thread and run operations
export async function createRun(
  threadId: string,
  assistantId: string,
  instructions?: string
) {
  return await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
    instructions
  })
}

export async function cancelRun(threadId: string, runId: string) {
  return await openai.beta.threads.runs.cancel(threadId, runId)
}

export async function getRun(threadId: string, runId: string) {
  return await openai.beta.threads.runs.retrieve(threadId, runId)
}

export async function listRuns(threadId: string) {
  return await openai.beta.threads.runs.list(threadId)
}

// Re-export OpenAI client for direct access if needed
export { openai as openaiClient }
