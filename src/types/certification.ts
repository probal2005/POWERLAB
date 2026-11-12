/**
 * POWERLAB certification database and RPC types.
 *
 * Source of truth:
 * supabase/migrations/20261112000400_powerlab_certification.sql
 */

export type CertificationJson =
  | string
  | number
  | boolean
  | null
  | CertificationJson[]
  | { [key: string]: CertificationJson };

export type CertificateStatus = 'active' | 'revoked';

export interface CertificationModule {
  law_slug: string;
  law_number: number;
  is_ready: boolean;
}

export interface CertificationAdminModule extends CertificationModule {
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificationLatestAttempt {
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  assessment_version: number;
  created_at: string;
}

export interface CertificationStudentStatus {
  modules: CertificationModule[];
  completed_law_slugs: string[];
  programme_enabled: boolean;
  final_assessment_published: boolean;
  pass_percentage: number;
  assessment_version: number;
  latest_attempt: CertificationLatestAttempt | null;
}

export interface CertificationFinalQuestion {
  id: string;
  question_en: string;
  question_bn: string;
  options_en: unknown;
  options_bn: unknown;
  sort_order: number;
}

export interface CertificationAdminQuestion
  extends CertificationFinalQuestion {
  correct_option: number;
  explanation_en: string;
  explanation_bn: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificationSubmittedAnswer {
  question_id: string;
  selected_option: number;
}

export interface CertificationAssessmentResult {
  attempt_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  pass_percentage: number;
}

export interface CertificationIssuedCertificate {
  certificate_id: string;
  qualification: string;
  issued_at: string;
  status: CertificateStatus;
}

export interface CertificationVerification {
  certificate_id: string;
  recipient_name: string;
  qualification: string;
  issued_at: string;
  status: CertificateStatus;
}

export interface CertificationProgramSettings {
  id: boolean;
  programme_enabled: boolean;
  final_assessment_published: boolean;
  assessment_version: number;
  pass_percentage: number;
  updated_by: string | null;
  updated_at: string;
}

export interface CertificationCertificateRecord {
  id: string;
  certificate_id: string;
  user_id: string;
  qualification: string;
  issued_at: string;
  status: CertificateStatus;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
}

export interface CertificationModuleCompletion {
  id: string;
  user_id: string;
  law_slug: string;
  completed_at: string;
}

export interface CertificationFinalAttemptRecord {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  assessment_version: number;
  percentage: number;
  passed: boolean;
  answers: CertificationJson[];
  created_at: string;
}
