import React from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Service } from '../../api/client';
import { AdvancedCheckOptions } from './AdvancedCheckOptions';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useEditServiceForm } from './useEditServiceForm';
import { EditServiceCheckTypeSection } from './EditServiceCheckTypeSection';
import { EditServiceMetaSection } from './EditServiceMetaSection';

interface EditServiceModalProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  service,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();
  const form = useEditServiceForm({ service, onClose, onSuccess });

  if (!isOpen || !service) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('services.editModalTitle')}
      subtitle={service.source === 'docker' ? `${service.name} (${t('services.dockerContainerTag')})` : service.name}
      maxWidth="max-w-lg"
    >
      {form.errorMsg && (
        <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs flex items-center gap-2.5 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{form.errorMsg}</span>
        </div>
      )}

        <form onSubmit={form.handleSave} className="space-y-3.5 text-sm">
          {/* Servis Adı */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formName')}
            </label>
            <input
              type="text"
              required
              value={form.formName}
              onChange={(e) => form.setFormName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Kontrol Türü ve Uç Nokta Alanları */}
          <EditServiceCheckTypeSection
            checkType={form.formCheckType}
            onChangeCheckType={form.setFormCheckType}
            url={form.formUrl}
            onChangeUrl={form.setFormUrl}
            health={form.formHealth}
            onChangeHealth={form.setFormHealth}
            port={form.formPort}
            onChangePort={form.setFormPort}
          />

          {/* Kategori, İkon, Etiketler ve Açıklama */}
          <EditServiceMetaSection
            category={form.formCategory}
            onChangeCategory={form.setFormCategory}
            icon={form.formIcon}
            onChangeIcon={form.setFormIcon}
            tags={form.formTags}
            onChangeTags={form.setFormTags}
            description={form.formDesc}
            onChangeDescription={form.setFormDesc}
          />

          {/* Gelişmiş Uptime & Kontrol Parametreleri (Modüler Bileşen) */}
          <AdvancedCheckOptions
            checkType={form.formCheckType}
            checkInterval={form.formCheckInterval}
            onChangeCheckInterval={form.setFormCheckInterval}
            timeoutSeconds={form.formTimeoutSeconds}
            onChangeTimeoutSeconds={form.setFormTimeoutSeconds}
            maxRetries={form.formMaxRetries}
            onChangeMaxRetries={form.setFormMaxRetries}
            retryInterval={form.formRetryInterval}
            onChangeRetryInterval={form.setFormRetryInterval}
            ignoreTls={form.formIgnoreTls}
            onChangeIgnoreTls={form.setFormIgnoreTls}
            acceptedStatusCodes={form.formAcceptedStatusCodes}
            onChangeAcceptedStatusCodes={form.setFormAcceptedStatusCodes}
            httpMethod={form.formHttpMethod}
            onChangeHttpMethod={form.setFormHttpMethod}
            expectedBody={form.formExpectedBody}
            onChangeExpectedBody={form.setFormExpectedBody}
          />

          {/* Genel Durum Sayfası Görünürlüğü */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
              <input
                type="checkbox"
                checked={form.formIsPublic}
                onChange={(e) => form.setFormIsPublic(e.target.checked)}
                className="accent-white rounded"
              />
              <span>{t('services.formIsPublic')}</span>
            </label>
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={form.saving}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              {form.saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
    </Modal>
  );
};
