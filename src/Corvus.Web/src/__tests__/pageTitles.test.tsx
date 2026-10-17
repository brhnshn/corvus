import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { I18nProvider, translateKey } from '../i18n';
import { en } from '../i18n/en';
import { tr } from '../i18n/tr';
import { Header } from '../components/layout/Header';
import { VALID_PAGES } from '../hooks/useAppNavigation';
import { fetchCommandItems } from '../components/common/CommandPalette/commandItems';
import { getPageTitle, formatDocumentTitle } from '../utils/pageTitle';
import type { PageId } from '../components/Sidebar';

describe('Page Title and Deployments Routing Integrity', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = 'Corvus';
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it('has nav.deployments defined in both en and tr translation dictionaries', () => {
    expect(en.nav.deployments).toBe('Deployments');
    expect(tr.nav.deployments).toBe('Dağıtımlar');
    expect(en.deployments.title).toBe('Deployment Center');
    expect(tr.deployments.title).toBe('Dağıtım Merkezi');
  });

  it('resolves valid page titles for all VALID_PAGES via getPageTitle without undefined', () => {
    const trT = (key: string) => translateKey(tr, key as any);
    const enT = (key: string) => translateKey(en, key as any);

    VALID_PAGES.forEach((pageId) => {
      const trTitle = getPageTitle(pageId, trT);
      const enTitle = getPageTitle(pageId, enT);

      expect(trTitle).toBeDefined();
      expect(enTitle).toBeDefined();
      expect(trTitle).not.toContain('undefined');
      expect(enTitle).not.toContain('undefined');
      expect(trTitle.trim().length).toBeGreaterThan(0);
      expect(enTitle.trim().length).toBeGreaterThan(0);

      // Verify formatted document title
      const trDocTitle = formatDocumentTitle(trTitle);
      const enDocTitle = formatDocumentTitle(enTitle);

      expect(trDocTitle).toBe(`${trTitle} - Corvus`);
      expect(enDocTitle).toBe(`${enTitle} - Corvus`);
      expect(trDocTitle).not.toContain('undefined');
      expect(enDocTitle).not.toContain('undefined');
    });

    // Specifically verify deployments
    expect(getPageTitle('deployments', trT)).toBe('Dağıtım Merkezi');
    expect(getPageTitle('deployments', enT)).toBe('Deployment Center');
    expect(formatDocumentTitle(getPageTitle('deployments', trT))).toBe('Dağıtım Merkezi - Corvus');
    expect(formatDocumentTitle(getPageTitle('deployments', enT))).toBe('Deployment Center - Corvus');
  });

  it('handles containers detail title when containerId is provided', () => {
    const trT = (key: string) => translateKey(tr, key as any);
    const titleWithId = getPageTitle('containers', trT, { selectedContainerId: 'cont-123' });
    expect(titleWithId).toBe('Konteyner Detayı');
    expect(formatDocumentTitle(titleWithId)).toBe('Konteyner Detayı - Corvus');

    const titleWithoutId = getPageTitle('containers', trT);
    expect(titleWithoutId).toBe('Konteynerler');
    expect(formatDocumentTitle(titleWithoutId)).toBe('Konteynerler - Corvus');
  });

  it('safely handles unknown or empty pages without producing Corvus - Corvus or undefined', () => {
    const trT = (key: string) => translateKey(tr, key as any);
    const unknownTitle = getPageTitle('unknown-page' as PageId, trT);
    expect(unknownTitle).toBe('');
    expect(formatDocumentTitle(unknownTitle)).toBe('Corvus');

    // formatDocumentTitle edge cases
    expect(formatDocumentTitle('')).toBe('Corvus');
    expect(formatDocumentTitle(null)).toBe('Corvus');
    expect(formatDocumentTitle(undefined)).toBe('Corvus');
    expect(formatDocumentTitle('Corvus')).toBe('Corvus');
    expect(formatDocumentTitle('undefined')).toBe('Corvus');
    expect(formatDocumentTitle('  undefined  ')).toBe('Corvus');
    expect(formatDocumentTitle('   ')).toBe('Corvus');
  });

  it('renders Header with proper title for every valid PageId without undefined', () => {
    VALID_PAGES.forEach((pageId) => {
      const { unmount } = render(
        <I18nProvider initialLanguage="tr">
          <Header
            currentPage={pageId}
            onSelectPage={() => {}}
            activeSystemName="TestHost"
            activeSystemIp="127.0.0.1"
          />
        </I18nProvider>
      );

      const titleEl = document.querySelector('h1.page-title');
      expect(titleEl).not.toBeNull();
      const text = titleEl?.textContent || '';
      expect(text).not.toContain('undefined');
      expect(text.trim().length).toBeGreaterThan(0);

      if (pageId === 'deployments') {
        expect(text).toBe('Dağıtım Merkezi');
      }

      unmount();
    });
  });

  it('renders Header with proper English title for deployments page', () => {
    render(
      <I18nProvider initialLanguage="en">
        <Header
          currentPage="deployments"
          onSelectPage={() => {}}
          activeSystemName="TestHost"
          activeSystemIp="127.0.0.1"
        />
      </I18nProvider>
    );

    const titleEl = document.querySelector('h1.page-title');
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('Deployment Center');
  });

  it('includes page-deployments command item in command palette items', async () => {
    const mockNavigate = vi.fn();
    const t = (key: string) => {
      if (key === 'deployments.title') return 'Deployment Center';
      if (key === 'nav.deployments') return 'Deployments';
      return key;
    };

    const items = await fetchCommandItems({
      t,
      onNavigate: mockNavigate,
    });

    const deploymentItem = items.find((item) => item.id === 'page-deployments');
    expect(deploymentItem).toBeDefined();
    expect(deploymentItem?.title).toBe('Deployment Center');
    expect(deploymentItem?.category).toBe('pages');

    deploymentItem?.onSelect();
    expect(mockNavigate).toHaveBeenCalledWith('deployments');
  });
});
