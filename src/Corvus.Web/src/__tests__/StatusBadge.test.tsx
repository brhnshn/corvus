import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusBadge } from '../components/ui/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders children content correctly', () => {
    render(<StatusBadge status="up">Çalışıyor</StatusBadge>);
    expect(screen.getByText('Çalışıyor')).toBeInTheDocument();
  });

  it('applies badge-up class for healthy status', () => {
    const { container } = render(<StatusBadge status="healthy">Online</StatusBadge>);
    const badge = container.querySelector('.badge');
    expect(badge).toHaveClass('badge-up');
  });

  it('applies badge-warn class for degraded/warn status', () => {
    const { container } = render(<StatusBadge status="warn">Uyarı</StatusBadge>);
    const badge = container.querySelector('.badge');
    expect(badge).toHaveClass('badge-warn');
  });

  it('applies badge-down class for offline/down status', () => {
    const { container } = render(<StatusBadge status="down">Kapalı</StatusBadge>);
    const badge = container.querySelector('.badge');
    expect(badge).toHaveClass('badge-down');
  });
});
