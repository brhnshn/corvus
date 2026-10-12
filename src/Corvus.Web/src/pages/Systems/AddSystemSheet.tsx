import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import { api } from '../../api';
import type { CreateSystemResponse } from '../../types';
import { resolveHubUrl, generateDockerRunCommand } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';

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

  if (!isOpen) return null;

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
    } catch (err: any) {
      setError(err?.message || 'Sistem kaydı oluşturulurken hata meydana geldi.');
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-[#1b1d2a] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className="text-base font-semibold text-[#eceef6]">
              {t('systems.addSheet.title')}
            </h3>
            <p className="text-xs text-[#9ba0b5] mt-0.5">
              {t('systems.addSheet.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-[#f87171]/10 border border-[#f87171]/20 text-xs text-[#f87171]">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#eceef6] mb-1.5">
                  {t('systems.addSheet.systemNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('systems.addSheet.systemNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#eceef6] mb-1.5">
                    {t('systems.addSheet.environmentLabel')}
                  </label>
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] focus:outline-none"
                  >
                    <option value="production" className="bg-[#1b1d2a]">Production</option>
                    <option value="staging" className="bg-[#1b1d2a]">Staging</option>
                    <option value="edge" className="bg-[#1b1d2a]">Edge</option>
                    <option value="homelab" className="bg-[#1b1d2a]">Homelab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#eceef6] mb-1.5">
                    {t('systems.addSheet.tagsLabel')}
                  </label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={e => setTagsStr(e.target.value)}
                    placeholder={t('systems.addSheet.tagsPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#eceef6] mb-1.5">
                  {t('systems.addSheet.hubUrlOverride')}
                </label>
                <input
                  type="text"
                  value={customHubUrl}
                  onChange={e => setCustomHubUrl(e.target.value)}
                  placeholder={resolveHubUrl()}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#d5d5dc] hover:bg-white text-xs font-semibold text-[#0d0e15] transition-colors disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : 'Devam Et (Komutu Üret) →'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-[#34d399]/10 border border-[#34d399]/20 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] animate-pulse" />
                <div className="text-xs">
                  <span className="font-semibold text-[#34d399]">
                    Sistem Kaydı Açıldı: {createdData?.system.name}
                  </span>
                  <p className="text-[#9ba0b5] text-[11px] mt-0.5">
                    {t('systems.addSheet.waitingHint')}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-2">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{t('systems.addSheet.stepCommandTitle')}</span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-[#eceef6] hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs text-sky-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                  {dockerCommand}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#eceef6] transition-colors"
                >
                  {t('systems.addSheet.finish')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
