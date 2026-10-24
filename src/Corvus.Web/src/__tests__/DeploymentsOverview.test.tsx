import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeploymentsOverview } from '../pages/Deployments/DeploymentsOverview';
import { I18nProvider } from '../i18n';

describe('DeploymentsOverview', () => {
  it('renders stats correctly with proper formatting', () => {
    const stats = {
      total: 42,
      successRate: 95.238,
      active: 3,
      avgDurationMs: 4250
    };

    render(
      <I18nProvider>
        <DeploymentsOverview stats={stats} />
      </I18nProvider>
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('%95.2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4.3 s')).toBeInTheDocument();
  });

  it('renders dash when stats are zero or empty', () => {
    const stats = {
      total: 0,
      successRate: 100,
      active: 0,
      avgDurationMs: 0
    };

    render(
      <I18nProvider>
        <DeploymentsOverview stats={stats} />
      </I18nProvider>
    );

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(2);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
