import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExpandableRow, TableWrap } from '../components/ui/ExpandableTable';

describe('ExpandableTable Components', () => {
  it('renders TableWrap and table properly', () => {
    const { container } = render(
      <TableWrap>
        <thead>
          <tr>
            <th>Başlık</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hücre</td>
          </tr>
        </tbody>
      </TableWrap>
    );

    expect(container.querySelector('.table-wrap')).toBeInTheDocument();
    expect(screen.getByText('Başlık')).toBeInTheDocument();
    expect(screen.getByText('Hücre')).toBeInTheDocument();
  });

  it('renders ExpandableRow with open class when isExpanded is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <ExpandableRow isExpanded={true} colSpan={4}>
            <div>Genişleyen Detay İçeriği</div>
          </ExpandableRow>
        </tbody>
      </table>
    );

    const wrapper = container.querySelector('.expand-wrapper');
    expect(wrapper).toHaveClass('open');
    expect(screen.getByText('Genişleyen Detay İçeriği')).toBeInTheDocument();
  });

  it('renders ExpandableRow without open class when isExpanded is false', () => {
    const { container } = render(
      <table>
        <tbody>
          <ExpandableRow isExpanded={false} colSpan={4}>
            <div>Gizli İçerik</div>
          </ExpandableRow>
        </tbody>
      </table>
    );

    const wrapper = container.querySelector('.expand-wrapper');
    expect(wrapper).not.toHaveClass('open');
  });
});
