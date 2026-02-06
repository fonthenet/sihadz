/**
 * AI Skills Index
 * Export all skill handlers and provide skill lookup
 */

import { AISkill, SkillHandler } from '../types';
import { SummarizeLabSkill } from './summarize-lab';
import { ExtractSymptomsSkill } from './extract-symptoms';
import { DraftClinicalNoteSkill } from './draft-clinical-note';
import { TriageMessageSkill } from './triage-message';
import { CarePlanSkill } from './care-plan';
import { InventoryForecastSkill } from './inventory-forecast';
import { QualityCheckSkill } from './quality-check';

// Instantiate all skill handlers
const skillHandlers: Map<AISkill, SkillHandler> = new Map([
  ['summarize_lab', new SummarizeLabSkill()],
  ['extract_symptoms', new ExtractSymptomsSkill()],
  ['draft_clinical_note', new DraftClinicalNoteSkill()],
  ['triage_message', new TriageMessageSkill()],
  ['generate_care_plan', new CarePlanSkill()],
  ['inventory_forecast', new InventoryForecastSkill()],
  ['quality_check', new QualityCheckSkill()],
]);

/**
 * Get a skill handler by name
 */
export function getSkillHandler(skill: AISkill): SkillHandler {
  const handler = skillHandlers.get(skill);
  if (!handler) {
    throw new Error(`Unknown AI skill: ${skill}`);
  }
  return handler;
}

/**
 * Check if a skill is supported
 */
export function isSkillSupported(skill: string): skill is AISkill {
  return skillHandlers.has(skill as AISkill);
}

/**
 * Get all supported skills
 */
export function getSupportedSkills(): AISkill[] {
  return Array.from(skillHandlers.keys());
}

// Export individual skill classes for direct use
export { SummarizeLabSkill } from './summarize-lab';
export { ExtractSymptomsSkill } from './extract-symptoms';
export { DraftClinicalNoteSkill } from './draft-clinical-note';
export { TriageMessageSkill } from './triage-message';
export { CarePlanSkill } from './care-plan';
export { InventoryForecastSkill } from './inventory-forecast';
export { QualityCheckSkill } from './quality-check';
