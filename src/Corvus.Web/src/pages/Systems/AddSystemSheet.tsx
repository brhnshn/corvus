import React, { useState } from 'react';
import { Copy, Check, Terminal, Server, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import type { CreateSystemResponse } from '../../types';
import { resolveHubUrl, generateDockerRunCommand } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface AddSystemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSystemCreated: () => void;
}

export const AddSystemSheet: React.FC<AddSystemSheetProps> = ({
  isOpen,
  onClose,
  onSystemCreated
}) => {
  const { t } = useI18n();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [tagsStr, setTagsStr] = useState('');
  const [customHubUrl, setCustomHubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdData, setCreatedData] = useState<CreateSystemResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setStep(1);
    setName('');
    setEnvironment('production');
    setTagsStr('');
    setCustomHubUrl('');
    setError(null);
    setCreatedData(null);
    setCopied(false);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const tags = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const res = await api.createSystem({
        name: name.trim(),
        environment,
        tags
      });

      setCreatedData(res);
      setStep(2);
      onSystemCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('systems.addSheet.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const hubUrlToUse = resolveHubUrl(customHubUrl || createdData?.hubUrl);
  const dockerCommand = createdData
    ? generateDockerRunCommand({
        hubUrl: hubUrlToUse,
        nodeKey: createdData.nodeKey
      })
    : '';

  const handleCopy = () => {
    if (!dockerCommand) return;
    navigator.clipboard.writeText(dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('systems.addSheet.title')}
      subtitle={t('systems.addSheet.subtitle')}
      icon={
        <div className="p-2 rounded-[var(--radius-md)] bg-[var(--cloud-500)]/10 text-[var(--cloud-400)] border border-[var(--cloud-500)]/20">
          <Server className="w-4 h-4" />
        </div>
      }
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t('systems.addSheet.systemNameLabel')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('systems.addSheet.systemNamePlaceholder')}
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  {t('systems.addSheet.environmentLabel')}
                </label>
                <select
                  value={environment}
                  onChange={e => setEnvironment(e.target.value)}
                  className="input w-full bg-[var(--bg-card)] cursor-pointer"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="edge">Edge</option>
                  <option value="homelab">Homelab</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  {t('systems.addSheet.tagsLabel')}
                </label>
                <input
                  type="text"
                  value={tagsStr}
                  onChange={e => setTagsStr(e.target.value)}
                  placeholder={t('systems.addSheet.tagsPlaceholder')}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t('systems.addSheet.hubUrlOverride')}
              </label>
              <input
                type="text"
                value={customHubUrl}
                onChange={e => setCustomHubUrl(e.target.value)}
                placeholder={resolveHubUrl()}
                className="input w-full font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
              >
                {t('systems.deleteModal.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
              >
                {loading ? t('systems.addSheet.creating') : t('systems.addSheet.submitStep1')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="text-xs min-w-0">
                <span className="font-semibold text-emerald-400">
                  {t('systems.addSheet.systemCreated', { name: createdData?.system.name || '' })}
                </span>
                <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
                  {t('systems.addSheet.waitingHint')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{t('systems.addSheet.stepCommandTitle')}</span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? t('systems.addSheet.copied') : t('systems.addSheet.copy')}
                </Button>
              </div>

              <div className="p-3.5 rounded-[var(--radius-md)] bg-black/60 border border-[var(--border-subtle)] font-mono text-xs text-sky-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                {dockerCommand}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleClose}
                className="w-full"
              >
                {t('systems.addSheet.finish')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
