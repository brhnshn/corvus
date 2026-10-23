import React from 'react';
import {
  RotateCw,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useComposeConfig } from './useComposeConfig';
import { ComposeModalHeader } from './compose/ComposeModalHeader';
import { ComposeCodeEditor } from './compose/ComposeCodeEditor';
import { ComposeDeployOutput } from './compose/ComposeDeployOutput';
import { ComposeModalFooter } from './compose/ComposeModalFooter';

interface ComposeConfigModalProps {
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export const ComposeConfigModal: React.FC<ComposeConfigModalProps> = ({
  projectName,
  isOpen,
  onClose,
  onSuccess,
  isAdmin = true
}) => {
  const { t } = useI18n();

  const {
    activeTab,
    setActiveTab,
    loading,
    saving,
    deploying,
    composeData,
    errorMessage,
    successMessage,
    copied,
    deployResult,
    showDeployOutput,
    hasTabWarning,
    activeContent,
    setActiveContent,
    lineCount,
    lineNumbers,
    loadComposeFile,
    handleCopy,
    handleSaveOnly,
    handleDeploy
  } = useComposeConfig({ projectName, isOpen, onSuccess, isAdmin });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deploying) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] animate-modal-card"
        role="dialog"
        aria-modal="true"
      >
        <ComposeModalHeader
          projectName={projectName}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          composeData={composeData}
          hasTabWarning={hasTabWarning}
          isBusy={saving || deploying}
          onClose={onClose}
        />

        {/* Modal Gövdesi: Editör */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 flex flex-col min-h-[380px]">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
              <RotateCw className="w-7 h-7 animate-spin text-[var(--cloud-200)]" />
              <p className="text-sm font-mono">{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 flex items-center gap-2.5 text-xs text-[var(--status-down)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 flex items-center gap-2.5 text-xs text-[var(--status-up)]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {hasTabWarning && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 flex items-center gap-2.5 text-xs text-[var(--status-warn)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{t('containers.composeYamlTabWarning')}</span>
                </div>
              )}

              <ComposeCodeEditor
                activeTab={activeTab}
                content={activeContent}
                onChange={setActiveContent}
                disabled={!isAdmin || saving || deploying}
                lineCount={lineCount}
                lineNumbers={lineNumbers}
                copied={copied}
                onCopy={handleCopy}
              />

              {showDeployOutput && deployResult && (
                <ComposeDeployOutput deployResult={deployResult} />
              )}
            </>
          )}
        </div>

        <ComposeModalFooter
          isAdmin={isAdmin}
          loading={loading}
          saving={saving}
          deploying={deploying}
          hasTabWarning={hasTabWarning}
          onRefresh={loadComposeFile}
          onClose={onClose}
          onSave={handleSaveOnly}
          onDeploy={handleDeploy}
        />
      </div>
    </div>
  );
};
