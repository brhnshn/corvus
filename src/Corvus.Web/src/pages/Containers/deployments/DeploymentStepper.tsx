import React from 'react';
import { useI18n } from '../../../i18n';
import type { DeploymentStep } from '../../../types/deployments';
import { Check, Loader2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export interface DeploymentStepperProps {
  currentStep: DeploymentStep;
  durationMs?: number;
  errorMessage?: string | null;
}

interface StepConfig {
  key: DeploymentStep;
  labelKey: string;
  descKey: string;
}

const STEPS: StepConfig[] = [
  { key: 'queued', labelKey: 'deployments.queued', descKey: 'deployments.stepQueuedDesc' },
  { key: 'pulling', labelKey: 'deployments.pulling', descKey: 'deployments.stepPullingDesc' },
  { key: 'recreating', labelKey: 'deployments.recreating', descKey: 'deployments.stepRecreatingDesc' },
  { key: 'healthcheck', labelKey: 'deployments.healthcheck', descKey: 'deployments.stepHealthcheckDesc' },
  { key: 'live', labelKey: 'deployments.live', descKey: 'deployments.stepLiveDesc' }
];

export const DeploymentStepper: React.FC<DeploymentStepperProps> = ({
  currentStep,
  durationMs,
  errorMessage
}) => {
  const { t } = useI18n();

  const isFailed = currentStep === 'failed';
  const isRolledBack = currentStep === 'rolled_back';

  // Find active step index in the normal progression
  const activeIndex = STEPS.findIndex((s) => s.key === currentStep);

  const getStepStatus = (index: number): 'completed' | 'active' | 'pending' | 'failed' | 'rolled_back' => {
    if (isRolledBack) {
      if (index === 4) return 'rolled_back';
      return index <= 2 ? 'completed' : 'pending';
    }
    if (isFailed) {
      if (index === activeIndex || (activeIndex === -1 && index === 2)) return 'failed';
      return index < activeIndex ? 'completed' : 'pending';
    }
    if (currentStep === 'live') {
      return 'completed';
    }
    if (index < activeIndex) return 'completed';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  const formatDuration = (ms?: number) => {
    if (typeof ms !== 'number' || ms <= 0) return null;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  };

  return (
    <div className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] p-4 select-none">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(idx);
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center min-w-[70px] flex-1 text-center group">
                <div
                  data-testid={`step-indicator-${step.key}`}
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-200
                    ${
                      status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : status === 'active'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/60 ring-2 ring-indigo-500/30'
                        : status === 'rolled_back'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : status === 'failed'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/60'
                        : 'bg-white/[0.04] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : status === 'rolled_back' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : status === 'failed' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <span
                  className={`
                    mt-2 text-[11.5px] font-medium truncate max-w-[90px] block transition-colors
                    ${
                      status === 'active'
                        ? 'text-indigo-300 font-semibold'
                        : status === 'completed'
                        ? 'text-emerald-400'
                        : status === 'rolled_back'
                        ? 'text-amber-400'
                        : status === 'failed'
                        ? 'text-rose-400'
                        : 'text-[var(--text-secondary)]'
                    }
                  `}
                  title={t(step.labelKey as any)}
                >
                  {t(step.labelKey as any)}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`
                    h-[2px] flex-1 max-w-[40px] -mt-5 transition-colors duration-200
                    ${
                      idx < activeIndex || currentStep === 'live'
                        ? 'bg-emerald-500/40'
                        : 'bg-[var(--border-subtle)]'
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step description and duration pill */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2 truncate">
          {isRolledBack ? (
            <span className="text-amber-400 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {t('deployments.stepRolledBackDesc')}
            </span>
          ) : isFailed ? (
            <span className="text-rose-400 flex items-center gap-1 font-medium truncate">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              {errorMessage || t('deployments.stepFailedDesc')}
            </span>
          ) : (
            <span className="truncate">
              {t(
                (STEPS.find((s) => s.key === currentStep)?.descKey ||
                  'deployments.stepQueuedDesc') as any
              )}
            </span>
          )}
        </div>

        {durationMs !== undefined && durationMs > 0 && (
          <span className="mono text-[11px] text-[var(--text-muted)] bg-white/[0.04] px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
    </div>
  );
};
