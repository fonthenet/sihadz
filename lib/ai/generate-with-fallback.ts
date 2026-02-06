import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { openai } from '@ai-sdk/openai'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1'

/** Ollama client (OpenAI-compatible API) - local, free */
const ollama =
  OLLAMA_BASE && OLLAMA_MODEL
    ? createOpenAI({
        baseURL: OLLAMA_BASE,
        apiKey: 'ollama',
      })
    : null

export interface GenerateResult {
  text: string
  provider: string
}

export interface GenerateOptions {
  maxTokens?: number
  /** System prompt - used to set role/behavior. Helps override refusal in some models. */
  system?: string
}

/**
 * Generate text using Ollama first (local), then OpenAI as fallback.
 * Requires at least Ollama running locally OR OPENAI_API_KEY.
 */
export async function generateWithFallback(prompt: string, maxTokens = 3000, options?: GenerateOptions): Promise<GenerateResult> {
  const opts = options || {}
  const tokens = opts.maxTokens ?? maxTokens
  const system = opts.system

  const providers: { name: string; model: ReturnType<typeof openai> }[] = []

  // 1. Ollama first (local, free)
  if (ollama) {
    providers.push({ name: 'Ollama (Local)', model: ollama(OLLAMA_MODEL) })
  }

  // 2. OpenAI as backup
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: 'OpenAI', model: openai('gpt-4o-mini') })
  }

  if (providers.length === 0) {
    throw new Error('No AI provider configured. Start Ollama locally or set OPENAI_API_KEY.')
  }

  let lastError: Error | null = null
  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider.name}...`)
      const { text } = await generateText({
        model: provider.model,
        system: system ?? 'You are a helpful assistant.',
        prompt,
        maxTokens: tokens,
      })
      console.log(`[AI] ${provider.name} succeeded`)
      return { text, provider: provider.name }
    } catch (error: unknown) {
      const err = error as Error
      console.warn(`[AI] ${provider.name} failed:`, err.message)
      lastError = err
    }
  }

  throw lastError || new Error('All AI providers failed')
}

/** True if at least one AI provider is available */
export function hasAiProvider(): boolean {
  return !!(ollama || process.env.OPENAI_API_KEY)
}
