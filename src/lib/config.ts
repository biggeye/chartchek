// Configuration constants and environment variables
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    orgId: process.env.OPENAI_ORG_ID,
    defaultModel: 'gpt-4o'
  },
  storage: {
    documentsPath: 'documents',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  assistants: {
    defaultModel: 'gpt-4o',
    maxThreadMessages: 100000,
    defaultInstructions: `You are a medical chart analysis assistant...`
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: 30000
  }
} as const

// Type-safe config access
export type Config = typeof config

// Validation function to ensure all required env vars are present
export function validateConfig() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
