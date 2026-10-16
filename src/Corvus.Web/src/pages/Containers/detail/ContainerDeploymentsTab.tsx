import React from 'react';
import { useI18n } from '../../../i18n';
import { useDeploymentsHistory } from '../deployments/useDeploymentsHistory';
import { DeploymentsTable } from '../deployments/DeploymentsTable';
import { Button } from '../../../components/ui/Button';
import { RefreshCw, Rocket } from 'lucide-react';

export interface ContainerDeploymentsTabProps {
  containerId: string;
  containerName?: string;
  isAdmin?: boolean;
  onTriggerDeploy?: () => void;
}

export const ContainerDeploymentsTab: React.FC<ContainerDeploymentsTabProps> = ({
  containerId,
  isAdmin = true,
  onTriggerDeploy
}) => {
  const { t } = useI18n();
  const { deployments, loading, refresh } = useDeploymentsHistory({
    targetId: containerId,
    limit: 50
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Tab Header Toolbar */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h4 className="text-xs font-semibold text-zinc-200">
            {t('deployments.historyTitle')}
          </h4>
          <p className="text-[11px] text-[var(--text-muted)]">
            {t('deployments.historySubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>

          {isAdmin && onTriggerDeploy && (
            <Button
              variant="primary"
              size="sm"
              onClick={onTriggerDeploy}
              icon={<Rocket className="w-3.5 h-3.5 text-indigo-300" />}
            >
              {t('deployments.triggerDeploy')}
            </Button>
          )}
        </div>
      </div>

      {/* Deployments List */}
      <DeploymentsTable deployments={deployments} loading={loading} />
    </div>
  );
};
