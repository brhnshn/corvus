import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type { DockerContainer } from '../../../types';

export interface ContainerRowImagePortsProps {
  container: DockerContainer;
  onOpenImageUpdate?: (container: DockerContainer) => void;
}

export const ContainerRowImagePorts: React.FC<ContainerRowImagePortsProps> = ({
  container,
  onOpenImageUpdate,
}) => {
  const { t } = useI18n();

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11.5px] text-[var(--text-muted)] truncate block flex-1" title={container.Image}>
          {container.Image}
        </span>
        {onOpenImageUpdate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenImageUpdate(container);
            }}
            title={t('containers.checkUpdate')}
            className="p-1 rounded text-[var(--text-muted)] hover:text-emerald-400 hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3 h-3" />
          </button>
        )}
      </div>
      {container.Ports && container.Ports.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {container.Ports.map((p, i) => {
            const label = p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`;
            const host = window.location.hostname || 'localhost';
            const href = p.PublicPort ? `http://${host}:${p.PublicPort}` : undefined;

            if (href) {
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={label}
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-[7px] bg-white/[0.08] hover:bg-white/[0.16] hover:text-white border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <span>{label}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                </a>
              );
            }

            return (
              <span
                key={i}
                className="font-mono text-[10.5px] px-2 py-0.5 rounded-[7px] bg-white/[0.08] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
