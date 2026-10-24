import React from 'react';
import type { DockerContainerInspectInfo, DockerContainer } from '../../../types';
import { getInspectConfig, getInspectState, getInspectHostConfig } from './inspectHelpers';
import { OverviewActionsToolbar } from './overview/OverviewActionsToolbar';
import { OverviewStatusCards } from './overview/OverviewStatusCards';
import { OverviewLimitCards } from './overview/OverviewLimitCards';
import { OverviewRuntimeInfo } from './overview/OverviewRuntimeInfo';

export interface ContainerOverviewTabProps {
  inspect: DockerContainerInspectInfo;
  containerSummary?: DockerContainer;
  isAdmin: boolean;
  actionLoading: boolean;
  showActionsToolbar?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onPause: () => void;
  onUnpause: () => void;
  onOpenTerminal: () => void;
  onOpenLogs: () => void;
  onOpenResourceLimitsModal?: () => void;
}

export const ContainerOverviewTab: React.FC<ContainerOverviewTabProps> = ({
  inspect,
  containerSummary: _containerSummary,
  isAdmin,
  actionLoading,
  showActionsToolbar = true,
  onStart,
  onStop,
  onRestart,
  onPause,
  onUnpause,
  onOpenTerminal,
  onOpenLogs,
  onOpenResourceLimitsModal,
}) => {
  const config = getInspectConfig(inspect);
  const state = getInspectState(inspect);
  const hostConfig = getInspectHostConfig(inspect);

  const isRunning = state.running ?? false;
  const isPaused = state.paused ?? false;
  const statusStr = state.status ?? 'unknown';

  return (
    <div className="space-y-4">
      {/* Quick Action Toolbar */}
      {showActionsToolbar && (
        <OverviewActionsToolbar
          isAdmin={isAdmin}
          actionLoading={actionLoading}
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={onStart}
          onStop={onStop}
          onRestart={onRestart}
          onPause={onPause}
          onUnpause={onUnpause}
          onOpenTerminal={onOpenTerminal}
          onOpenLogs={onOpenLogs}
        />
      )}

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <OverviewStatusCards
          inspect={inspect}
          state={state}
          isRunning={isRunning}
          statusStr={statusStr}
        />

        <OverviewLimitCards
          hostConfig={hostConfig}
          isAdmin={isAdmin}
          onOpenResourceLimitsModal={onOpenResourceLimitsModal}
        />
      </div>

      <OverviewRuntimeInfo inspect={inspect} config={config} />
    </div>
  );
};
