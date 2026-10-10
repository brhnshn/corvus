import type { DockerContainer, DockerContainerInspectInfo, ContainerStats } from '../../types';

export type ContainerDetailTab = 
  | 'overview' 
  | 'resources' 
  | 'env' 
  | 'networking' 
  | 'storage' 
  | 'logs' 
  | 'terminal';

export interface ContainerDetailPageProps {
  containerId: string;
  onBack: () => void;
  isAdmin?: boolean;
}

export interface ContainerDetailState {
  container: DockerContainer | null;
  inspectInfo: DockerContainerInspectInfo | null;
  liveStats: ContainerStats | null;
  loading: boolean;
  error: string | null;
}
