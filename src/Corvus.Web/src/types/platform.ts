export interface AuthStatus {
  authEnabled: boolean;
  isAuthenticated: boolean;
  username?: string | null;
  role?: 'admin' | 'viewer' | string | null;
  hasUsers: boolean;
  registrationEnabled: boolean;
}

export interface UserDto {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer' | string;
  createdAt: string;
}

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseUrl: string;
}

export interface DbStatsResponse {
  sizeBytes: number;
  dbSizeBytes: number;
  walSizeBytes: number;
  formattedSize: string;
}

export interface BackupEvent {
  id: number;
  token: string;
  receivedAt: string;
  status: 'success' | 'failure';
  sizeBytes?: number;
  message?: string;
}
