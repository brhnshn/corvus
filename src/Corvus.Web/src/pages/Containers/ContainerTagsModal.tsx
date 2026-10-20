import React, { useState } from 'react';
import { Tag, Loader2, Check } from 'lucide-react';
import type { DockerContainer } from '../../types';
import { api } from '../../api';
import { TagInput } from '../../components/common/TagInput';
import { useI18n } from '../../i18n';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { extractContainerTags } from './utils/containerTags';

interface ContainerTagsModalProps {
  container: DockerContainer;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: (updatedTags: string[]) => void;
}

export const ContainerTagsModal: React.FC<ContainerTagsModalProps> = ({
  container,
  isOpen = true,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const rawName = container.Names?.[0] || container.Id.slice(0, 12);
  const cleanName = rawName.replace(/^\//, '');
  const shortId = container.Id.slice(0, 12);

  const initialTags = React.useMemo(() => {
    if (container.tags && container.tags.length > 0) {
      return [...container.tags];
    }
    return extractContainerTags(container.Labels);
  }, [container.tags, container.Labels]);

  const suggestions = React.useMemo(() => {
    const list = ['Prod', 'Staging', 'Dev', 'Internal', 'Database', 'API', 'Web'];
    const composeProj = container.Labels?.['com.docker.compose.project'];
    if (composeProj && !list.includes(composeProj)) {
      list.unshift(composeProj);
    }
    return list;
  }, [container]);

  const [tags, setTags] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const success = await api.updateContainerTags(container.Id, tags);
      if (success) {
        onSuccess(tags);
        onClose();
      } else {
        setError(t('containers.tagsSaveError'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('containers.operationError'));
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-sm text-[var(--text-primary)]">{cleanName}</span>
      <span className="mono text-xs text-[var(--text-muted)]">({shortId})</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={t('containers.tagsModalTitle')}
      icon={<Tag className="w-5 h-5 text-[var(--text-primary)]" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {t('containers.tagsModalDesc')}
        </p>

        {error && (
          <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/25 text-xs text-[var(--status-down)]">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)]">
            {t('services.formTags')}
          </label>
          <TagInput
            tags={tags}
            onChange={setTags}
            suggestions={suggestions}
            placeholder={t('services.tagPlaceholder')}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            icon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
