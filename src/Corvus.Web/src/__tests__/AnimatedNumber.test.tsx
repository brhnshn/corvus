import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

describe('AnimatedNumber Component', () => {
  it('renders numeric value with prefix and suffix', () => {
    render(
      <AnimatedNumber 
        value={99.9} 
        prefix="%" 
        suffix=" Uptime" 
        decimals={1} 
      />
    );

    expect(screen.getByText(/%99\.9/)).toBeInTheDocument();
  });

  it('formats decimals with precision correctly', () => {
    render(<AnimatedNumber value={14.256} decimals={2} />);
    expect(screen.getByText('14.26')).toBeInTheDocument();
  });

  it('renders integer when decimals is 0', () => {
    render(<AnimatedNumber value={42} decimals={0} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
