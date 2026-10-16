/**
 * Corvus Deployment Center Types
 */

export type DeploymentTriggerType = 'manual_ui' | 'manual_scratch' | 'webhook_github' | 'scheduled';

export type DeploymentStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';

export type DeploymentStep = 
  | 'queued' 
  | 'pulling' 
  | 'recreating' 
  | 'healthcheck' 
  | 'live' 
  | 'rolled_back' 
  | 'failed';

export interface DeploymentRecord {
  id: string;
  targetType: 'container';
  targetId: string;
  targetName: string;
  triggerType: DeploymentTriggerType;
  triggeredBy: string;
  status: DeploymentStatus;
  currentStep: DeploymentStep;
  imageName: string;
  oldDigest?: string | null;
  newDigest?: string | null;
  durationMs: number;
  errorMessage?: string | null;
  logOutput?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface TriggerDeployResponse {
  deploymentId: string;
  targetId: string;
  status: string;
  message?: string;
}

// SSE / WebSocket Event Types
export interface DeploymentStepChangedEvent {
  type: 'step_changed';
  deploymentId: string;
  step: DeploymentStep;
  timestamp: string;
}

export interface DeploymentLogChunkEvent {
  type: 'log';
  deploymentId: string;
  chunk: string;
  timestamp: string;
}

export interface DeploymentCompletedEvent {
  type: 'completed';
  deploymentId: string;
  status: DeploymentStatus;
  durationMs: number;
  newDigest?: string | null;
  error?: string | null;
  timestamp: string;
}

export type DeploymentStreamEvent =
  | DeploymentStepChangedEvent
  | DeploymentLogChunkEvent
  | DeploymentCompletedEvent;

export interface ActiveDeploymentState {
  deploymentId: string;
  containerId: string;
  containerName: string;
  imageName?: string;
  status: DeploymentStatus;
  currentStep: DeploymentStep;
  startedAt: number;
  durationMs?: number;
  logs: string[];
  error?: string | null;
}

export interface ScratchDeploymentRequest {
  image: string;
  containerName: string;
  ports?: string;
  env?: string;
  restartPolicy?: string;
  network?: string;
}

export interface ContainerConnectionTestResult {
  containerId: string;
  name: string;
  isRunning: boolean;
  status: string;
  healthStatus?: string | null;
  ipAddress?: string | null;
  exposedPorts: string[];
  canConnect: boolean;
  message: string;
}

export interface DeployWebhookInfoResponse {
  token: string;
}
