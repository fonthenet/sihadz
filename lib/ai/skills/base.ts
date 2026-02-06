/**
 * Base Skill Handler
 * Abstract base class for all AI skill handlers
 */

import { AISkill, Language, AIContext, SkillHandler } from '../types';
import { getDisclaimer } from '../safety/post-check';

export abstract class BaseSkillHandler<TInput = any, TOutput = any> implements SkillHandler<TInput, TOutput> {
  abstract skill: AISkill;
  preferredModel?: string = 'llama3';
  temperature?: number = 0.7;
  maxTokens?: number = 2000;

  abstract getSystemPrompt(language: Language): string;
  abstract buildUserPrompt(input: TInput, context?: AIContext): string;
  
  /**
   * Parse the AI response - default implementation tries JSON parsing
   */
  parseResponse(response: string): TOutput {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as TOutput;
      }
      
      // If no JSON found, return the raw text wrapped in an object
      return { text: response } as unknown as TOutput;
    } catch (err) {
      console.warn('[Skill] Failed to parse response as JSON:', err);
      return { text: response, parseError: true } as unknown as TOutput;
    }
  }

  /**
   * Get disclaimer for this skill
   */
  getDisclaimer(language: Language): string {
    return getDisclaimer(this.skill, language);
  }

  /**
   * Validate input - default implementation always passes
   */
  validateInput(input: TInput): { valid: boolean; error?: string } {
    if (!input) {
      return { valid: false, error: 'Input is required' };
    }
    return { valid: true };
  }

  /**
   * Helper to format patient history for prompts
   */
  protected formatPatientHistory(history?: AIContext['patientHistory']): string {
    if (!history) return '';

    const parts: string[] = [];

    if (history.profile) {
      parts.push(`Patient: ${history.profile.full_name || 'Unknown'}, Age: ${history.profile.age || 'Unknown'}`);
    }

    if (history.conditions && history.conditions.length > 0) {
      parts.push(`Conditions: ${history.conditions.join(', ')}`);
    }

    if (history.allergies && history.allergies.length > 0) {
      parts.push(`Allergies: ${history.allergies.join(', ')}`);
    }

    if (history.prescriptions && history.prescriptions.length > 0) {
      const meds = history.prescriptions.flatMap((p: any) => 
        (p.medications || []).map((m: any) => m.medication_name || m.name)
      ).filter(Boolean);
      if (meds.length > 0) {
        parts.push(`Current Medications: ${meds.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get the JSON output format instruction
   */
  protected getJsonInstruction(): string {
    return 'Output MUST be valid JSON. No markdown, no code blocks, just the JSON object.';
  }
}
