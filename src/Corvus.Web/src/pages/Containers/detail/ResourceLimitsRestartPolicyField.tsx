import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface ResourceLimitsRestartPolicyFieldProps {
  restartPolicy: string;
  onRestartPolicyChange: (value: string) => void;
  maxRetries: string;
  onMaxRetriesChange: (value: string) => void;
  saving: boolean;
}

// Restart Policy Selection
export const ResourceLimitsRestartPolicyField: React.FC<ResourceLimitsRestartPolicyFieldProps> = ({
  restartPolicy,
  onRestartPolicyChange,
  maxRetries,
  onMaxRetriesChange,
  saving,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-4 surface rounded-2xl border border-[var(--border-hairline)] space-y-3">
      <div className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-emerald-400" />
        <label className="text-xs font-bold text-[var(--text-primary)]">
          {t('containers.restartPolicyLabel')}
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { id: 'no', label: t('containers.restartPolicyNo'), desc: t('containers.restartPolicyNoDesc') },
          { id: 'always', label: t('containers.restartPolicyAlways'), desc: t('containers.restartPolicyAlwaysDesc') },
          { id: 'unless-stopped', label: t('containers.restartPolicyUnlessStopped'), desc: t('containers.restartPolicyUnlessStoppedDesc') },
          { id: 'on-failure', label: t('containers.restartPolicyOnFailure'), desc: t('containers.restartPolicyOnFailureDesc') },
        ].map((item) => (
          <label
            key={item.id}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              restartPolicy === item.id
                ? 'bg-white/[0.08] border-white/40 text-[var(--text-primary)] shadow-xs'
                : 'bg-white/[0.02] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="restartPolicyModal"
              value={item.id}
              checked={restartPolicy === item.id}
              disabled={saving}
              onChange={() => onRestartPolicyChange(item.id)}
              className="sr-only"
            />
            <div className="font-bold text-xs text-[var(--text-primary)] mb-0.5">{item.label}</div>
            <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{item.desc}</div>
          </label>
        ))}
      </div>

      {/* On-Failure Retry Count */}
      {restartPolicy === 'on-failure' && (
        <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
          <label htmlFor="resource-modal-retries" className="text-xs font-semibold text-[var(--text-primary)]">
            {t('containers.maxRetriesLabel')}
          </label>
          <input
            id="resource-modal-retries"
            type="number"
            min="0"
            step="1"
            value={maxRetries}
            disabled={saving}
            onChange={(e) => onMaxRetriesChange(e.target.value)}
            placeholder="0"
            className="w-full sm:w-48 px-3.5 py-1.5 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-emerald-400"
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            {t('containers.maxRetriesHelp')}
          </p>
        </div>
      )}
    </div>
  );
};
