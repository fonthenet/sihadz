/**
 * GET /api/ai/health
 * Check AI service availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasAiProvider, getSupportedSkills } from '@/lib/ai';

export async function GET(request: NextRequest) {
  const available = hasAiProvider();
  const skills = getSupportedSkills();
  
  return NextResponse.json({
    status: available ? 'healthy' : 'unavailable',
    available,
    providers: {
      ollama: !!process.env.OLLAMA_BASE_URL,
      openai: !!process.env.OPENAI_API_KEY,
    },
    supportedSkills: skills,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
