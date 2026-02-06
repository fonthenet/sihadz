#!/usr/bin/env node
/**
 * Quick test of Ollama + OpenAI fallback.
 * Run: node scripts/test-ollama.mjs
 * Requires: Ollama running (ollama run llama3.1) and optionally OPENAI_API_KEY
 */

import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1'

const ollama = createOpenAI({
  baseURL: OLLAMA_BASE,
  apiKey: 'ollama',
})

console.log('Testing AI providers...')
console.log('Ollama:', OLLAMA_BASE, '| Model:', OLLAMA_MODEL)
console.log('')

const prompt = 'Say "Hello from Ollama!" in one short sentence. Nothing else.'

try {
  console.log('[1] Trying Ollama (llama3.1)...')
  const { text } = await generateText({
    model: ollama(OLLAMA_MODEL),
    prompt,
    maxTokens: 100,
  })
  console.log('[OK] Ollama response:', text.trim())
  console.log('')
  console.log('Success! Ollama is working as primary AI provider.')
  process.exit(0)
} catch (err) {
  console.log('[FAIL] Ollama:', err.message)
  console.log('')

  if (process.env.OPENAI_API_KEY) {
    console.log('[2] Falling back to OpenAI...')
    try {
      const { openai } = await import('@ai-sdk/openai')
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        maxTokens: 100,
      })
      console.log('[OK] OpenAI response:', text.trim())
      console.log('')
      console.log('Fallback worked. Ollama failed but OpenAI succeeded.')
      process.exit(0)
    } catch (e) {
      console.log('[FAIL] OpenAI:', e.message)
      process.exit(1)
    }
  } else {
    console.log('No OPENAI_API_KEY set for fallback.')
    console.log('Fix: Start Ollama with "ollama run llama3.1" or set OPENAI_API_KEY')
    process.exit(1)
  }
}
