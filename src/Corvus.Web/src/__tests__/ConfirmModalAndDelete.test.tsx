import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { I18nProvider } from '../i18n';
import { containersApi } from '../api/containers';
import { systemsApi } from '../api/systems';

describe('ConfirmModal & deleteContainer API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders ConfirmModal with title, description, and triggers onConfirm/onClose', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <I18nProvider>
        <ConfirmModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Delete Container"
          description="Are you sure you want to delete this container?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
        >
          <div data-testid="custom-child">Force delete checkbox</div>
        </ConfirmModal>
      </I18nProvider>
    );

    expect(screen.getByText('Delete Container')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this container?')).toBeInTheDocument();
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls DELETE /api/containers/:id with force and removeVolumes query params', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Container deleted successfully.' }),
    } as unknown as Response);

    const res = await containersApi.deleteContainer('abc123456789', true, true);
    expect(res.message).toBe('Container deleted successfully.');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/containers/abc123456789?force=true&removeVolumes=true',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('calls POST /api/v1/systems/:id/containers/:cid/delete via systemsApi.sendContainerAction', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, output: 'abc123456789' }),
    } as unknown as Response);

    const res = await systemsApi.sendContainerAction('remote-node-1', 'abc123456789', 'delete');
    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/systems/remote-node-1/containers/abc123456789/delete',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
