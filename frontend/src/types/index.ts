// src/types/index.ts
export type Role = 'APPLICANT' | 'INSTITUTION' | 'ADMIN';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: Role;
  name: string;
  user_id: number;
}

export interface ApplicantProfile {
  id: number;
  user_id: number;
  age: number | null;
  employment_type: string | null;
  education_level: string | null;
  family_status: string | null;
  housing_type: string | null;
  employment_years: number | null;
}

export interface ShapContributor {
  feature: string;
  friendly_label: string;
  shap_value: number;
  contribution_type: 'increases_risk' | 'decreases_risk';
  is_synthetic: boolean;
}

export interface AssessmentResult {
  id: number;
  credit_score: number;
  risk_level: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  default_probability: number;
  recommendation: 'ELIGIBLE' | 'REVIEW_REQUIRED' | 'NOT_ELIGIBLE';
  model_version: string;
  top_contributors: ShapContributor[];
  created_at: string;
}

export interface AssessmentHistoryItem {
  id: number;
  credit_score: number;
  risk_level: string;
  recommendation: string;
  model_version: string;
  default_probability: number;
  created_at: string;
}

export interface AssessmentInput {
  monthly_income: number;
  requested_credit_amount: number;
  monthly_annuity: number;
  bureau_loan_count: number;
  bureau_overdue_ratio: number;
  prev_application_count: number;
  prev_approval_rate: number;
  installment_late_ratio: number;
  installment_avg_days_late: number;
  ext_source_1: number;
  ext_source_2: number;
  ext_source_3: number;
  syn_upi_txn_count_monthly: number;
  syn_avg_txn_amount: number;
  syn_txn_consistency: number;
  syn_utility_payment_reliability: number;
  syn_monthly_savings_rate: number;
  syn_income_stability_score: number;
}

export interface InstitutionStatus {
  institution_name: string;
  client_id: string;
  latest_federated_round: number;
  global_model_version: string;
  local_dataset_stats: {
    n_train: number;
    n_val: number;
    target_rate_train: number;
    target_rate_val: number;
  };
}

export interface InstitutionMetrics {
  institution_name: string;
  client_id: string;
  local_metrics: {
    local_loss: number;
    local_accuracy: number;
    n_samples: number;
  };
  global_metrics: {
    roc_auc: number;
    accuracy: number;
    f1: number;
  };
}

export interface AdminDashboard {
  total_applicants: number;
  total_institutions: number;
  total_assessments: number;
  system_status: string;
  centralized_metrics: Record<string, number>;
  federated_metrics: Record<string, number> | null;
  data_mode: string;
}

export interface FairnessCohortMetrics {
  n: number;
  approval_rate: number;
  true_positive_rate: number | null;
  false_positive_rate?: number | null;
}

export interface FairnessCohortData {
  group_attribute: string;
  group_metrics: Record<string, FairnessCohortMetrics>;
  demographic_parity_difference: number;
  equal_opportunity_difference: number | null;
  false_positive_rate_difference?: number | null;
}

export interface FairnessResult extends FairnessCohortData {
  thin_file_fairness?: FairnessCohortData;
  income_type_fairness?: FairnessCohortData;
  note: string;
}

export interface FederatedRound {
  id: number;
  round_number: number;
  status: string;
  global_model_version: string;
  participating_clients: string;
  metrics: string;
  created_at: string;
}

export interface FederatedStatus {
  status: string;
  latest_round: number;
  global_model_version: string;
  global_metrics: Record<string, number>;
}

export interface FederatedTrainResult {
  global_model_version: string;
  rounds_completed: number;
  final_global_metrics: Record<string, number>;
  round_history: Array<{ round: number; global_metrics: Record<string, number> }>;
}
