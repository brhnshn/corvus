import { fetchJson } from './http';
import type { SystemdUnitDto, SystemdLogsDto } from '../types';

export const systemdApi = {
  getUnits: (systemId?: string): Promise<SystemdUnitDto[]> => {
    const url = systemId && systemId !== 'local'
      ? `/v1/systems/${encodeURIComponent(systemId)}/systemd`
      : '/v1/systems/systemd';
    return fetchJson<SystemdUnitDto[]>(url);
  },

  controlUnit: (
    unitName: string,
    action: 'start' | 'stop' | 'restart',
    systemId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const url = systemId && systemId !== 'local'
      ? `/v1/systems/${encodeURIComponent(systemId)}/systemd/${encodeURIComponent(unitName)}/action`
      : `/v1/systems/systemd/${encodeURIComponent(unitName)}/action`;
    return fetchJson<{ success: boolean; message?: string }>(url, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  },

  getLogs: (
    unitName: string,
    lines: number = 100,
    systemId?: string
  ): Promise<SystemdLogsDto> => {
    const url = systemId && systemId !== 'local'
      ? `/v1/systems/${encodeURIComponent(systemId)}/systemd/${encodeURIComponent(unitName)}/logs?lines=${lines}`
      : `/v1/systems/systemd/${encodeURIComponent(unitName)}/logs?lines=${lines}`;
    return fetchJson<SystemdLogsDto>(url);
  }
};
