import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DeploymentStepper } from '../pages/Containers/deployments/DeploymentStepper';
import { I18nProvider } from '../i18n';

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('DeploymentStepper Component', () => {
  it('renders all step indicators and labels', () => {
    renderWithI18n(<DeploymentStepper currentStep="queued" />);

    expect(screen.getByTestId('step-indicator-queued')).toBeInTheDocument();
    expect(screen.getByTestId('step-indicator-pulling')).toBeInTheDocument();
    expect(screen.getByTestId('step-indicator-recreating')).toBeInTheDocument();
    expect(screen.getByTestId('step-indicator-healthcheck')).toBeInTheDocument();
    expect(screen.getByTestId('step-indicator-live')).toBeInTheDocument();
  });

  it('marks active step with active style and spin icon', () => {
    renderWithI18n(<DeploymentStepper currentStep="pulling" />);

    const pullingStep = screen.getByTestId('step-indicator-pulling');
    expect(pullingStep.className).toContain('text-indigo-400');
  });

  it('marks previous steps as completed when on recreating', () => {
    renderWithI18n(<DeploymentStepper currentStep="recreating" />);

    const queuedStep = screen.getByTestId('step-indicator-queued');
    const pullingStep = screen.getByTestId('step-indicator-pulling');

    expect(queuedStep.className).toContain('text-emerald-400');
    expect(pullingStep.className).toContain('text-emerald-400');
  });

  it('displays duration when provided', () => {
    renderWithI18n(<DeploymentStepper currentStep="live" durationMs={8400} />);

    expect(screen.getByText('8.4s')).toBeInTheDocument();
  });

  it('displays rolled back status with warning styling', () => {
    renderWithI18n(<DeploymentStepper currentStep="rolled_back" />);

    const liveStep = screen.getByTestId('step-indicator-live');
    expect(liveStep.className).toContain('text-amber-400');
  });

  it('displays error message when step is failed', () => {
    renderWithI18n(<DeploymentStepper currentStep="failed" errorMessage="Image pull timeout" />);

    expect(screen.getByText('Image pull timeout')).toBeInTheDocument();
  });
});
