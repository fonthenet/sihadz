/**
 * AI Infrastructure Types
 * Core types for the DzDoc AI system
 */

export type AIProvider = 'ollama' | 'openai' | 'claude' | 'none';

export type AISkill = 
  | 'summarize_lab'
  | 'extract_symptoms'
  | 'draft_clinical_note'
  | 'triage_message'
  | 'translate_simplify'
  | 'explain_medication'
  | 'generate_care_plan'
  | 'suggest_lab_orders'
  | 'check_interactions'
  | 'inventory_forecast'
  | 'normalize_data'
  | 'patient_analysis'
  | 'health_advice'
  | 'referral_letter'
  | 'quality_check';

export type UserRole = 'patient' | 'doctor' | 'lab' | 'pharmacy' | 'admin';

export type Language = 'ar' | 'fr' | 'en';

export interface AIRequest {
  skill: AISkill;
  input: Record<string, any>;
  context?: AIContext;
  userId: string;
  userRole: UserRole;
  language: Language;
  ticketId?: string;
  appointmentId?: string;
}

export interface AIContext {
  patientId?: string;
  providerId?: string;
  previousResults?: any[];
  protocols?: string[];
  customInstructions?: string;
  patientHistory?: PatientHistory;
}

export interface PatientHistory {
  profile?: any;
  appointments?: any[];
  prescriptions?: any[];
  labResults?: any[];
  allergies?: string[];
  conditions?: string[];
  familyMembers?: any[];
}

export interface AIResponseMetadata {
  provider: AIProvider;
  model: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  cached: boolean;
  auditId: string;
}

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  disclaimer?: string;
  metadata: AIResponseMetadata;
}

// ============================================
// SKILL OUTPUT TYPES
// ============================================

export interface LabSummaryOutput {
  summary: string;
  highlights: Array<{
    testName: string;
    value: string;
    status: 'normal' | 'low' | 'high' | 'critical';
    explanation: string;
  }>;
  trends?: Array<{
    testName: string;
    change: 'improved' | 'worsened' | 'stable';
    previousValue: string;
    currentValue: string;
  }>;
  recommendations: string[];
  urgentFlags: string[];
}

export interface SymptomExtractionOutput {
  symptoms: Array<{
    name: string;
    duration: string;
    severity: 'mild' | 'moderate' | 'severe';
    frequency: string;
  }>;
  suggestedSpecialty: string;
  suggestedVisitType: 'online' | 'in_person' | 'home_visit';
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  followUpQuestions: string[];
  redFlags: string[];
}

export interface ClinicalNoteOutput {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: string;
  assessment: string;
  plan: string;
  icdSuggestions: Array<{ code: string; description: string }>;
}

export interface MessageTriageOutput {
  category: 'appointment' | 'medication' | 'lab_result' | 'urgent' | 'admin' | 'billing' | 'general' | 'prescription';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedReply: string;
  requiresHumanReview: boolean;
  escalationReason?: string;
  suggestedActions: string[];
}

export interface CarePlanOutput {
  todayActions: string[];
  warningSignsWatchFor: string[];
  medicationInstructions: Array<{
    medication: string;
    instructions: string;
    timing: string;
  }>;
  followUpSchedule: string;
  lifestyleAdvice: string[];
  emergencyInstructions: string;
}

export interface MedicationExplanationOutput {
  name: string;
  genericName: string;
  purpose: string;
  howItWorks: string;
  commonSideEffects: string[];
  seriousSideEffects: string[];
  whenToSeekHelp: string[];
  generalPrecautions: string[];
  storageInstructions: string;
}

export interface DrugInteractionOutput {
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
    description: string;
    recommendation: string;
  }>;
  duplications: Array<{
    drugs: string[];
    reason: string;
  }>;
  overallRisk: 'low' | 'moderate' | 'high';
  pharmacistNotes: string;
}

export interface LabOrderSuggestionOutput {
  labSuggestions: Array<{
    testName: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
    testCode?: string;
  }>;
  imagingSuggestions: Array<{
    type: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  referralSuggestions: Array<{
    specialty: string;
    reason: string;
    urgency: 'routine' | 'soon' | 'urgent';
  }>;
}

export interface InventoryForecastOutput {
  productId: string;
  productName: string;
  currentStock: number;
  predictedDemand: {
    next7Days: number;
    next30Days: number;
  };
  reorderRecommendation: {
    shouldReorder: boolean;
    suggestedQuantity: number;
    suggestedDate: string;
    reason: string;
  };
  seasonalFactors: string[];
  slowMoverAlert: boolean;
}

export interface QualityCheckOutput {
  overallStatus: 'passed' | 'requires_review' | 'failed';
  flags: Array<{
    testName: string;
    issue: string;
    currentValue: string;
    normalRange?: string;
    action: string;
    severity: 'warning' | 'critical' | 'panic';
  }>;
  missingFields: string[];
  deltaAlerts: Array<{
    testName: string;
    previousValue: string;
    currentValue: string;
    changePercent: number;
  }>;
  recommendation: string;
}

// ============================================
// SKILL HANDLER INTERFACE
// ============================================

export interface SkillHandler<TInput = any, TOutput = any> {
  skill: AISkill;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  
  getSystemPrompt(language: Language): string;
  buildUserPrompt(input: TInput, context?: AIContext): string;
  parseResponse(response: string): TOutput;
  getDisclaimer(language: Language): string;
  validateInput(input: TInput): { valid: boolean; error?: string };
}

// ============================================
// SAFETY TYPES
// ============================================

export interface PreCheckResult {
  safe: boolean;
  reason?: string;
  sanitizedInput?: any;
  emergencyDetected?: boolean;
  emergencyMessage?: string;
}

export interface PostCheckResult {
  safe: boolean;
  sanitized: any;
  warnings: string[];
  modified: boolean;
}

// ============================================
// AUDIT TYPES
// ============================================

export interface AuditLogEntry {
  userId: string;
  userRole: UserRole;
  skill: AISkill;
  provider: AIProvider;
  model: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  inputHash: string;
  outputSummary: string | null;
  ticketId?: string;
  appointmentId?: string;
  success: boolean;
  errorMessage?: string;
  language?: Language;
}
