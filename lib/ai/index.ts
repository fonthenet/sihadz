/**
 * DzDoc AI Service
 * Main entry point for all AI operations
 * 
 * Features:
 * - Multi-provider support (Ollama primary, OpenAI fallback)
 * - Safety layer (pre/post checks)
 * - Audit logging
 * - Skill-based architecture
 * - Rate limiting ready (currently unlimited for testing)
 */

import { AIRequest, AIResponse, AIProvider } from './types';
import { generateWithFallback, hasAiProvider } from './generate-with-fallback';
import { runPreChecks, runPostChecks, getDisclaimer } from './safety';
import { logAudit, hashInput, summarizeOutput } from './audit';
import { getSkillHandler, isSkillSupported } from './skills';

/**
 * Execute an AI skill with full safety and audit pipeline
 */
export async function executeAI<T = any>(request: AIRequest): Promise<AIResponse<T>> {
  const startTime = Date.now();
  let auditId = '';
  let usedProvider: AIProvider = 'none';
  let usedModel = '';
  let tokens = { input: 0, output: 0 };

  try {
    // 0. Check if AI is available
    if (!hasAiProvider()) {
      return {
        success: false,
        error: 'AI service not configured. Please start Ollama or configure OpenAI.',
        metadata: {
          provider: 'none',
          model: 'none',
          tokens: { input: 0, output: 0 },
          latencyMs: Date.now() - startTime,
          cached: false,
          auditId: '',
        },
      };
    }

    // 1. Validate skill exists
    if (!isSkillSupported(request.skill)) {
      return {
        success: false,
        error: `Unknown skill: ${request.skill}`,
        metadata: {
          provider: 'none',
          model: 'none',
          tokens: { input: 0, output: 0 },
          latencyMs: Date.now() - startTime,
          cached: false,
          auditId: '',
        },
      };
    }

    // 2. Get skill handler
    const skillHandler = getSkillHandler(request.skill);

    // 3. Validate input
    const inputValidation = skillHandler.validateInput(request.input);
    if (!inputValidation.valid) {
      return {
        success: false,
        error: inputValidation.error || 'Invalid input',
        metadata: {
          provider: 'none',
          model: 'none',
          tokens: { input: 0, output: 0 },
          latencyMs: Date.now() - startTime,
          cached: false,
          auditId: '',
        },
      };
    }

    // 4. Pre-flight safety checks
    const preCheckResult = await runPreChecks(request);
    if (!preCheckResult.safe) {
      // If emergency detected, return the emergency message
      if (preCheckResult.emergencyDetected) {
        return {
          success: false,
          error: preCheckResult.emergencyMessage || preCheckResult.reason,
          metadata: {
            provider: 'none',
            model: 'none',
            tokens: { input: 0, output: 0 },
            latencyMs: Date.now() - startTime,
            cached: false,
            auditId: '',
          },
        };
      }
      return {
        success: false,
        error: preCheckResult.reason || 'Request blocked by safety check',
        metadata: {
          provider: 'none',
          model: 'none',
          tokens: { input: 0, output: 0 },
          latencyMs: Date.now() - startTime,
          cached: false,
          auditId: '',
        },
      };
    }

    // 5. Build prompts
    const systemPrompt = skillHandler.getSystemPrompt(request.language);
    const userPrompt = skillHandler.buildUserPrompt(request.input, request.context);

    // 6. Generate with fallback (Ollama → OpenAI)
    const { text, provider } = await generateWithFallback(
      userPrompt,
      skillHandler.maxTokens || 2000,
      {
        system: systemPrompt,
        maxTokens: skillHandler.maxTokens,
      }
    );

    usedProvider = provider.includes('Ollama') ? 'ollama' : 'openai';
    usedModel = provider.includes('Ollama') ? 'llama3' : 'gpt-4o-mini';
    
    // Estimate tokens (rough estimation)
    tokens = {
      input: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
      output: Math.ceil(text.length / 4),
    };

    // 7. Parse response
    let parsed: any;
    try {
      parsed = skillHandler.parseResponse(text);
    } catch (parseError) {
      console.error('[AI] Parse error:', parseError);
      parsed = { text, parseError: true };
    }

    // 8. Post-flight safety checks
    const postCheckResult = await runPostChecks(parsed, request.skill);
    if (!postCheckResult.safe) {
      return {
        success: false,
        error: 'Response failed safety check',
        metadata: {
          provider: usedProvider,
          model: usedModel,
          tokens,
          latencyMs: Date.now() - startTime,
          cached: false,
          auditId: '',
        },
      };
    }

    const finalData = postCheckResult.sanitized;

    // 9. Log audit
    auditId = await logAudit({
      userId: request.userId,
      userRole: request.userRole,
      skill: request.skill,
      provider: usedProvider,
      model: usedModel,
      tokens,
      latencyMs: Date.now() - startTime,
      inputHash: hashInput(request.input),
      outputSummary: summarizeOutput(finalData),
      ticketId: request.ticketId,
      appointmentId: request.appointmentId,
      success: true,
      language: request.language,
    });

    // 10. Return successful response
    return {
      success: true,
      data: finalData as T,
      disclaimer: skillHandler.getDisclaimer(request.language),
      metadata: {
        provider: usedProvider,
        model: usedModel,
        tokens,
        latencyMs: Date.now() - startTime,
        cached: false,
        auditId,
      },
    };

  } catch (error: any) {
    console.error('[AI] Error:', error);

    // Log failed attempt
    await logAudit({
      userId: request.userId,
      userRole: request.userRole,
      skill: request.skill,
      provider: usedProvider,
      model: usedModel,
      tokens,
      latencyMs: Date.now() - startTime,
      inputHash: hashInput(request.input),
      outputSummary: null,
      ticketId: request.ticketId,
      appointmentId: request.appointmentId,
      success: false,
      errorMessage: error.message,
      language: request.language,
    });

    return {
      success: false,
      error: 'AI service temporarily unavailable. Please try again.',
      metadata: {
        provider: usedProvider,
        model: usedModel,
        tokens,
        latencyMs: Date.now() - startTime,
        cached: false,
        auditId,
      },
    };
  }
}

/**
 * Quick execute for simple AI requests (less boilerplate)
 */
export async function quickAI<T = any>(
  skill: AIRequest['skill'],
  input: any,
  userId: string,
  userRole: AIRequest['userRole'] = 'patient',
  language: AIRequest['language'] = 'fr'
): Promise<AIResponse<T>> {
  return executeAI<T>({
    skill,
    input,
    userId,
    userRole,
    language,
  });
}

// Re-export types
export * from './types';

// Re-export utilities
export { hasAiProvider } from './generate-with-fallback';
export { getSkillHandler, isSkillSupported, getSupportedSkills } from './skills';
export { logAudit, getUserAIUsage, canUseSkill, logFeedback } from './audit';
export { getDisclaimer } from './safety/post-check';
