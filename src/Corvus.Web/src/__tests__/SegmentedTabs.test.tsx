import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';

describe('SegmentedTabs Component', () => {
  const tabs = [
    { id: 'tab1', label: 'Birinci Sekme', meta: 5 },
    { id: 'tab2', label: 'İkinci Sekme', meta: 12 },
    { id: 'tab3', label: 'Üçüncü Sekme' },
  ];

  it('renders all tab labels and metadata', () => {
    render(<SegmentedTabs tabs={tabs} activeTab="tab1" onChange={() => {}} />);

    expect(screen.getByText('Birinci Sekme')).toBeInTheDocument();
    expect(screen.getByText('İkinci Sekme')).toBeInTheDocument();
    expect(screen.getByText('Üçüncü Sekme')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('marks active tab with active class and aria-selected true', () => {
    render(<SegmentedTabs tabs={tabs} activeTab="tab2" onChange={() => {}} />);

    const buttons = screen.getAllByRole('tab');
    expect(buttons[0]).not.toHaveClass('active');
    expect(buttons[0]).toHaveAttribute('aria-selected', 'false');

    expect(buttons[1]).toHaveClass('active');
    expect(buttons[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('triggers onChange callback when clicking an inactive tab', () => {
    const handleChange = vi.fn();
    render(<SegmentedTabs tabs={tabs} activeTab="tab1" onChange={handleChange} />);

    fireEvent.click(screen.getByText('İkinci Sekme'));
    expect(handleChange).toHaveBeenCalledWith('tab2');
  });
});
