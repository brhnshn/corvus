import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContainerResourceLimitsModal } from '../pages/Containers/detail/ContainerResourceLimitsModal';
import { I18nProvider } from '../i18n';
import { containersApi } from '../api/containers';
import type { DockerContainerInspectInfo } from '../types';

const mockInspect: DockerContainerInspectInfo = {
  id: 'abc123container',
  name: '/my-test-container',
  created: '2026-01-01T00:00:00Z',
  path: '/bin/sh',
  args: [],
  state: {
    status: 'running',
    running: true,
    paused: false,
    restarting: false,
    oomKilled: false,
    dead: false,
    pid: 1234,
    exitCode: 0,
    error: '',
    startedAt: '2026-01-01T00:00:00Z',
    finishedAt: '',
  },
  image: 'sha256:1234567890abcdef',
  hostConfig: {
    nanoCpus: 1_500_000_000, // 1.5 cores
    memory: 536870912, // 512 MB
    restartPolicy: {
      name: 'unless-stopped',
      maximumRetryCount: 0,
    },
  },
  config: {
    image: 'nginx:alpine',
    env: ['ENV=production'],
    cmd: ['nginx', '-g', 'daemon off;'],
  },
};

describe('ContainerResourceLimitsModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const renderModal = (props: Partial<Parameters<typeof ContainerResourceLimitsModal>[0]> = {}) => {
    const defaultProps = {
      isOpen: true,
      containerId: 'abc123container',
      containerName: 'my-test-container',
      inspect: mockInspect,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
    };

    const mergedProps = { ...defaultProps, ...props };

    return {
      ...render(
        <I18nProvider>
          <ContainerResourceLimitsModal {...mergedProps} />
        </I18nProvider>
      ),
      props: mergedProps,
    };
  };

  it('renders modal with title, container name, and initial inspect limits', () => {
    renderModal();

    expect(screen.getByText(/Resource Limits & Restart Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/my-test-container/i)).toBeInTheDocument();

    // Check CPU input initialized to 1.5
    const cpuInput = screen.getByLabelText(/CPU Allocation/i) as HTMLInputElement;
    expect(cpuInput.value).toBe('1.5');

    // Check Memory input initialized to 512
    const memInput = screen.getByLabelText(/Memory Limit/i) as HTMLInputElement;
    expect(memInput.value).toBe('512');
  });

  it('updates CPU input when clicking a CPU preset button', () => {
    renderModal();

    const cpuInput = screen.getByLabelText(/CPU Allocation/i) as HTMLInputElement;
    expect(cpuInput.value).toBe('1.5');

    // Click '2.0c' preset button
    const preset2c = screen.getByRole('button', { name: '2.0c' });
    fireEvent.click(preset2c);

    expect(cpuInput.value).toBe('2.0');
  });

  it('updates Memory input when clicking a Memory preset button', () => {
    renderModal();

    const memInput = screen.getByLabelText(/Memory Limit/i) as HTMLInputElement;
    expect(memInput.value).toBe('512');

    // Click '1 GB' preset button
    const preset1Gb = screen.getByRole('button', { name: '1 GB' });
    fireEvent.click(preset1Gb);

    expect(memInput.value).toBe('1024');
  });

  it('toggles max retry count input visibility based on restart policy', () => {
    renderModal();

    // Initially 'unless-stopped', retry input shouldn't exist
    expect(screen.queryByLabelText(/Maximum Retry Count/i)).not.toBeInTheDocument();

    // Select 'on-failure'
    const onFailureRadio = screen.getByDisplayValue('on-failure');
    fireEvent.click(onFailureRadio);

    // Now max retry count input should be visible
    expect(screen.getByLabelText(/Maximum Retry Count/i)).toBeInTheDocument();

    // Switch to 'always'
    const alwaysRadio = screen.getByDisplayValue('always');
    fireEvent.click(alwaysRadio);

    expect(screen.queryByLabelText(/Maximum Retry Count/i)).not.toBeInTheDocument();
  });

  it('validates against memory limit less than 6 MB (if > 0)', async () => {
    const updateSpy = vi.spyOn(containersApi, 'updateContainerResources');
    renderModal();

    const memInput = screen.getByLabelText(/Memory Limit/i);
    fireEvent.change(memInput, { target: { value: '4' } }); // 4 MB is invalid in Docker (minimum 6 MB)

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Minimum memory limit is 6 MB/i)).toBeInTheDocument();
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('validates against negative CPU limit', async () => {
    const updateSpy = vi.spyOn(containersApi, 'updateContainerResources');
    renderModal();

    const cpuInput = screen.getByLabelText(/CPU Allocation/i);
    fireEvent.change(cpuInput, { target: { value: '-0.5' } });

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/CPU cores must be 0 or greater/i)).toBeInTheDocument();
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('successfully submits valid resource limits, calls API, onSuccess, and onClose', async () => {
    const updateSpy = vi.spyOn(containersApi, 'updateContainerResources').mockResolvedValue({
      success: true,
      message: 'Container resources updated successfully',
    });

    const { props } = renderModal();

    const cpuInput = screen.getByLabelText(/CPU Allocation/i);
    fireEvent.change(cpuInput, { target: { value: '2.5' } });

    const memInput = screen.getByLabelText(/Memory Limit/i);
    fireEvent.change(memInput, { target: { value: '1024' } });

    const alwaysRadio = screen.getByDisplayValue('always');
    fireEvent.click(alwaysRadio);

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('abc123container', {
        cpuCores: 2.5,
        memoryMb: 1024,
        restartPolicy: 'always',
        maximumRetryCount: 0,
      });
    });

    expect(props.onSuccess).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('displays error message when API call returns failure', async () => {
    vi.spyOn(containersApi, 'updateContainerResources').mockResolvedValue({
      success: false,
      message: 'Docker daemon returned error: MemorySwap limit should be greater or equal',
    });

    const { props } = renderModal();

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/MemorySwap limit should be greater or equal/i)).toBeInTheDocument();
    });

    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onSuccess).not.toHaveBeenCalled();
  });

  it('correctly reads PascalCase inspect data from Docker daemon and pre-fills form', () => {
    const pascalInspect = {
      Id: 'pascal123container',
      Name: '/pascal-container',
      HostConfig: {
        NanoCpus: 2_000_000_000,
        Memory: 1073741824, // 1024 MB
        RestartPolicy: {
          Name: 'on-failure',
          MaximumRetryCount: 3,
        },
      },
    } as unknown as DockerContainerInspectInfo;

    renderModal({ inspect: pascalInspect, containerName: 'pascal-container' });

    // Check CPU input initialized to 2
    const cpuInput = screen.getByLabelText(/CPU Allocation/i) as HTMLInputElement;
    expect(cpuInput.value).toBe('2');

    // Check Memory input initialized to 1024
    const memInput = screen.getByLabelText(/Memory Limit/i) as HTMLInputElement;
    expect(memInput.value).toBe('1024');

    // Check on-failure radio is checked
    const onFailureRadio = screen.getByDisplayValue('on-failure') as HTMLInputElement;
    expect(onFailureRadio.checked).toBe(true);

    // Check retry count initialized to 3
    const retriesInput = screen.getByLabelText(/Maximum Retry Count/i) as HTMLInputElement;
    expect(retriesInput.value).toBe('3');
  });
});
