import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObsidianAreaChart, type ChartDataPoint } from '../components/ui/ObsidianAreaChart';

describe('ObsidianAreaChart Component', () => {
  const sampleData: ChartDataPoint[] = [
    { time: '12:00', fullTime: '12:00:00', value: 20 },
    { time: '12:01', fullTime: '12:01:00', value: 45 },
    { time: '12:02', fullTime: '12:02:00', value: 80 },
    { time: '12:03', fullTime: '12:03:00', value: 35 },
  ];

  it('renders empty message when data is empty', () => {
    render(<ObsidianAreaChart data={[]} emptyMessage="Kayıt bulunamadı" />);
    expect(screen.getByText('Kayıt bulunamadı')).toBeInTheDocument();
  });

  it('renders SVG chart with polyline and gradient path when data is provided', () => {
    const { container } = render(
      <ObsidianAreaChart 
        data={sampleData} 
        color="#34d399" 
        unit="%" 
        ariaLabel="CPU Test Grafiği" 
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'CPU Test Grafiği');

    // Gradient defs ve path kontrolü
    const linearGradient = container.querySelector('linearGradient');
    expect(linearGradient).toBeInTheDocument();

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // Hem area hem line path
  });

  it('renders time tick labels and peak value', () => {
    render(
      <ObsidianAreaChart 
        data={sampleData} 
        color="#34d399" 
        unit="%" 
      />
    );

    expect(screen.getByText(/12:00 — 12:03/)).toBeInTheDocument();
    expect(screen.getByText(/Zirve:/)).toBeInTheDocument();
  });

  it('shows the measured peak, not the axis maximum, even when max is fixed', () => {
    render(<ObsidianAreaChart data={sampleData} unit="%" max={100} />);

    expect(screen.getByText('Zirve: 80.0%')).toBeInTheDocument();
  });
});
