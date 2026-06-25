export type UserRole = 'admin' | 'labeler' | 'reviewer';

export interface User {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  company_id: number;
  company_name: string;
  is_active: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
}

export type ProjectAssignmentMode = 'preemptive' | 'manual';

export interface Project {
  id: number;
  company_id: number;
  company_name: string;
  name: string;
  description: string;
  oss_prefix: string;
  assignment_mode: ProjectAssignmentMode;
  task_count: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'labeling' | 'analyzing' | 'completed' | 'failed';

export interface Task {
  id: number;
  project_id: number;
  project_name: string;
  oss_key: string;
  oss_size?: number;
  oss_etag?: string;
  oss_last_modified?: string;
  status: TaskStatus;
  assigned_to: number | null;
  assigned_username: string | null;
  analysis_prompt: string;
  analysis_error: string;
  presigned_url: string | null;
  created_at?: string;
  updated_at?: string;
  events?: VideoEvent[];
}

export type EventSource = 'model' | 'manual';
export type EventStatus = 'active' | 'deleted';

export interface VideoEvent {
  id: number;
  task_id: number;
  start_time_ms: number;
  end_time_ms: number;
  title: string;
  description: string;
  reasoning_description: string;
  confidence: number;
  source: EventSource;
  status: EventStatus;
  raw_payload?: Record<string, unknown>;
}

export interface AnalysisQuery {
  id: number;
  task_id: number;
  query: string;
  query_hash: string;
  prompt_version: string;
  event_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'accepted' | 'rejected' | 'edited';

export interface ReviewResult {
  eventId: number;
  status: ReviewStatus;
  comment?: string;
}

export interface EventEditPayload {
  title: string;
  description: string;
  reasoning_description: string;
  start_time_ms: number;
  end_time_ms: number;
}

export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface AnalysisJob {
  id: number;
  job_type: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  last_error: string;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  finished_at?: string;
}

