import React from 'react';
import { Save, Rocket, RotateCw } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { Button } from '../../../components/ui/Button';

interface ComposeModalFooterProps {
  isAdmin: boolean;
  loading: boolean;
  saving: boolean;
  deploying: boolean;
  hasTabWarning: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onSave: () => void;
  onDeploy: () => void;
}

/** Modal Alt Çubuk & Aksiyon Butonları */
export const ComposeModalFooter: React.FC<ComposeModalFooterProps> = ({
  isAdmin,
  loading,
  saving,
  deploying,
  hasTabWarning,
  onRefresh,
  onClose,
  onSave,
  onDeploy
}) => {
  const { t } = useI18n();

  return (
    <div className="px-5 py-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={loading || saving || deploying}
        icon={<RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
      >
        <span>{t('common.refresh')}</span>
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={saving || deploying}
        >
          <span>{t('common.close')}</span>
        </Button>

        {isAdmin && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onSave}
              disabled={loading || saving || deploying || hasTabWarning}
              isLoading={saving}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              <span>{t('containers.composeSaveOnly')}</span>
            </Button>

            <Button
              variant="cloud"
              size="sm"
              onClick={onDeploy}
              disabled={loading || saving || deploying || hasTabWarning}
              isLoading={deploying}
              icon={<Rocket className="w-3.5 h-3.5" />}
            >
              <span>{deploying ? t('containers.composeDeploying') : t('containers.composeDeploy')}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
