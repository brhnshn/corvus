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
      <div className="py-12 text-center text-slate-500">
        <p className="text-sm">{t('containers.noEnvVars')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search environment variables..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
            {showSecrets ? t('containers.envHideSecrets') : t('containers.envShowSecrets')}
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {t('containers.copyEnvAll')}
          </button>
        </div>
      </div>

      {/* Env Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/80 font-mono text-xs">
          {filteredEnv.map((item) => {
            const masked = isSensitive(item.key) && !showSecrets;
            return (
              <div
                key={item.key}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2.5 hover:bg-slate-800/40 transition-colors group items-center"
              >
                <div className="md:col-span-5 font-semibold text-slate-300 break-all select-all flex items-center gap-1.5">
                  <span className="text-indigo-400 font-bold">$</span>
                  {item.key}
                </div>

                <div className="md:col-span-6 text-slate-400 break-all select-all">
                  {masked ? (
                    <span className="text-slate-600 select-none tracking-widest font-sans">••••••••••••••••</span>
                  ) : (
                    <span className="text-emerald-400/90">{item.value || <span className="text-slate-600 italic">empty</span>}</span>
                  )}
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopySingle(item.value, item.key)}
                    className="p-1 text-slate-500 hover:text-slate-200 transition-colors rounded group-hover:bg-slate-800"
                    title="Copy value"
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
      <div className="text-right text-[11px] text-slate-500">
        Total: {filteredEnv.length} variable{filteredEnv.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
