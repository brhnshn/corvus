import React, { useState, useMemo } from 'react';
import { useI18n } from '../../../i18n';
import { Eye, EyeOff, Copy, Check, Search } from 'lucide-react';

interface ContainerEnvTabProps {
  envList?: string[];
}

export const ContainerEnvTab: React.FC<ContainerEnvTabProps> = ({ envList = [] }) => {
  const { t } = useI18n();
  const [showSecrets, setShowSecrets] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const parsedEnv = useMemo(() => {
    return envList.map((entry) => {
      const idx = entry.indexOf('=');
      if (idx === -1) {
        return { key: entry, value: '' };
      }
      return {
        key: entry.substring(0, idx),
        value: entry.substring(idx + 1)
      };
    });
  }, [envList]);

  const filteredEnv = useMemo(() => {
    if (!searchTerm.trim()) return parsedEnv;
    const q = searchTerm.toLowerCase();
    return parsedEnv.filter((item) => item.key.toLowerCase().includes(q) || item.value.toLowerCase().includes(q));
  }, [parsedEnv, searchTerm]);

  const isSensitive = (key: string) => {
    const sensitiveWords = ['pass', 'pwd', 'secret', 'token', 'key', 'auth', 'private', 'cert'];
    const k = key.toLowerCase();
    return sensitiveWords.some((w) => k.includes(w));
  };

  const handleCopyAll = () => {
    const text = parsedEnv.map((e) => `${e.key}=${e.value}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!envList || envList.length === 0) {
    return (
      <div className="py-12 text-center text-[#9ba0b5]">
        <p className="text-sm">{t('containers.noEnvVars')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba0b5]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ortam değişkenlerinde ara..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl text-[#eceef6] placeholder-[#9ba0b5] focus:outline-none focus:border-[#d5d5dc] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#eceef6] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors cursor-pointer"
          >
            {showSecrets ? <EyeOff className="w-3.5 h-3.5 text-[#9ba0b5]" /> : <Eye className="w-3.5 h-3.5 text-[#fbbf24]" />}
            {showSecrets ? t('containers.envHideSecrets') : t('containers.envShowSecrets')}
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#eceef6] bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 rounded-xl transition-colors cursor-pointer"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#9ba0b5]" />}
            {t('containers.copyEnvAll')}
          </button>
        </div>
      </div>

      {/* Env Table */}
      <div className="border border-white/10 rounded-2xl overflow-hidden surface">
        <div className="max-h-96 overflow-y-auto divide-y divide-white/10 font-mono text-xs">
          {filteredEnv.map((item) => {
            const masked = isSensitive(item.key) && !showSecrets;
            return (
              <div
                key={item.key}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 hover:bg-white/[0.04] transition-colors group items-center"
              >
                <div className="md:col-span-5 font-semibold text-[#eceef6] break-all select-all flex items-center gap-1.5">
                  <span className="text-[#9ba0b5] font-bold">$</span>
                  {item.key}
                </div>

                <div className="md:col-span-6 text-[#9ba0b5] break-all select-all">
                  {masked ? (
                    <span className="text-[#9ba0b5]/40 select-none tracking-widest font-sans">••••••••••••••••</span>
                  ) : (
                    <span className="text-[#34d399]">{item.value || <span className="text-[#9ba0b5]/40 italic">boş</span>}</span>
                  )}
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopySingle(item.value, item.key)}
                    className="p-1.5 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors rounded-lg cursor-pointer"
                    title="Değeri kopyala"
                  >
                    {copiedKey === item.key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-right text-[11px] text-[#9ba0b5] font-mono">
        Toplam: {filteredEnv.length} değişken
      </div>
    </div>
  );
};
