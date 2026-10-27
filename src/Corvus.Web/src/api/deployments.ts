import { fetchJson } from './http';
import { getActiveSystemId } from '../hooks/activeSystemStore';
import type { 
  DeploymentRecord, 
  TriggerDeployResponse, 
  DeploymentStreamEvent,
  ScratchDeploymentRequest,
  ContainerConnectionTestResult,
  DeployWebhookInfoResponse
} from '../types/deployments';

export interface GetDeploymentsParams {
  targetId?: string;
  limit?: number;
}

export const deploymentsApi = {
  /**
   * Triggers a new deployment for an existing container. Returns 202 Accepted.
   */
  async triggerDeploy(containerId: string): Promise<TriggerDeployResponse> {
    return fetchJson<TriggerDeployResponse>(`/containers/${encodeURIComponent(containerId)}/deploy`, {
      method: 'POST'
    });
  },

  /**
   * Deploys a new container from scratch (image, name, ports, env). Returns 202 Accepted.
   */
  async triggerScratchDeploy(req: ScratchDeploymentRequest): Promise<TriggerDeployResponse> {
    return fetchJson<TriggerDeployResponse>('/deployments/scratch', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  /**
   * Tests connection and health status of an existing container.
   */
  async testContainerConnection(containerId: string): Promise<ContainerConnectionTestResult> {
    return fetchJson<ContainerConnectionTestResult>(`/deployments/containers/test-connection/${encodeURIComponent(containerId)}`);
  },

  /**
   * Fetches the deployment webhook token (auto-creates if none exists).
   */
  async getWebhookToken(): Promise<DeployWebhookInfoResponse> {
    return fetchJson<DeployWebhookInfoResponse>('/deployments/webhook-token');
  },

  /**
   * Fetches recent deployments list, optionally filtered by container targetId
   */
  async getDeployments(params?: GetDeploymentsParams): Promise<DeploymentRecord[]> {
    const query = new URLSearchParams();
    if (params?.targetId) query.set('targetId', params.targetId);
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return fetchJson<DeploymentRecord[]>(`/deployments${qs ? `?${qs}` : ''}`);
  },

  /**
   * Fetches full deployment record including accumulated logOutput
   */
  async getDeploymentDetails(id: string): Promise<DeploymentRecord> {
    return fetchJson<DeploymentRecord>(`/deployments/${encodeURIComponent(id)}`);
  },

  /**
   * Subscribes to live Server-Sent Events stream for a specific deployment.
   * Returns a cleanup / disconnect function.
   */
  subscribeDeploymentStream(
    deploymentId: string,
    onMessage: (event: DeploymentStreamEvent) => void,
    onError?: (error: Event) => void
  ): () => void {
    const activeSystemId = getActiveSystemId();
    let url = `/api/deployments/${encodeURIComponent(deploymentId)}/stream`;
    if (activeSystemId) {
      url += `?systemId=${encodeURIComponent(activeSystemId)}`;
    }

    let closed = false;
    const eventSource = new EventSource(url);

    const closeStream = () => {
      if (!closed) {
        closed = true;
        eventSource.close();
      }
    };

    eventSource.onmessage = (event) => {
      if (closed) return;
      try {
        const parsed: DeploymentStreamEvent = JSON.parse(event.data);
        onMessage(parsed);
        // Dağıtım sonuçlandıysa (success, failed, rolled_back), EventSource derhal kapatılır;
        // böylece tarayıcının sonsuz yeniden bağlanıp logları tekrar tekrar eklemesi önlenir!
        if (parsed.type === 'completed') {
          closeStream();
        }
      } catch (err) {
        console.warn('Failed to parse SSE deployment payload:', event.data, err);
      }
    };

    eventSource.onerror = (err) => {
      if (closed) return;
      onError?.(err);
      if (eventSource.readyState === EventSource.CLOSED) {
        closeStream();
      }
    };

    return closeStream;
  }
};
