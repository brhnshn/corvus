import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Boxes,
  Activity,
  Clock,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type { PageId } from './Sidebar';

interface BottomNavProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

interface NavItem {
  id: PageId;
  label: string;
  full: string;
  icon: LucideIcon;
}

// Seçili sütunun diğerlerine göre genişliği (1fr = pasif sütun)
const ACTIVE_FR = 3.3;

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onSelectPage }) => {
  const { t } = useI18n();

  const items: NavItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), full: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'services', label: t('nav.services'), full: t('nav.services'), icon: Grid },
    { id: 'containers', label: t('nav.containers'), full: t('nav.containers'), icon: Boxes },
    { id: 'metrics', label: t('nav.metricsShort'), full: t('nav.metrics'), icon: Activity },
    { id: 'uptime', label: t('nav.uptime'), full: t('nav.uptime'), icon: Clock },
    { id: 'settings', label: t('nav.settings'), full: t('nav.settings'), icon: Settings },
    { id: 'profile', label: t('nav.profileShort'), full: t('nav.profile'), icon: User },
  ];

  const totalFr = items.length - 1 + ACTIVE_FR;
  const activeIndex = items.findIndex((it) => it.id === currentPage);
  const active = activeIndex === -1 ? 0 : activeIndex;

  const columns = items.map((_, i) => (i === active ? `${ACTIVE_FR}fr` : '1fr')).join(' ');

  return (
    <nav
      aria-label="Ana gezinme"
      className="
        fixed inset-x-2.5 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-[520px] lg:hidden
        h-16 rounded-full p-1.5 select-none
        bg-[#1b1d2a]/55 backdrop-blur-2xl backdrop-saturate-[1.9]
        border border-white/15
        shadow-[0_10px_30px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.22)]
      "
    >
      <div className="relative h-full">
        {/* Kayan hap */}
        <span
          aria-hidden
          className="
            absolute inset-y-0 rounded-full bg-[#d5d5dc]
            transition-[left] duration-[550ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none
          "
          style={{
            width: `${(ACTIVE_FR / totalFr) * 100}%`,
            left: `${(active / totalFr) * 100}%`,
          }}
        />

        {/* Sekmeler */}
        <ul
          className="
            relative grid h-full
            transition-[grid-template-columns] duration-[550ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none
          "
          style={{ gridTemplateColumns: columns }}
        >
          {items.map(({ id, label, full, icon: Icon }, i) => {
            const isActive = i === active;
            return (
              <li key={id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectPage(id)}
                  aria-label={full}
                  aria-current={isActive ? 'page' : undefined}
                  title={full}
                  className={`
                    flex h-full w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-full
                    text-[13px] font-semibold outline-none cursor-pointer
                    transition-[color,transform] duration-300 active:scale-90
                    focus-visible:ring-2 focus-visible:ring-[#d5d5dc] focus-visible:ring-offset-0
                    ${isActive ? 'text-[#1b1d2a]' : 'text-[#9ba0b5] hover:text-[#e5e7eb]'}
                  `}
                >
                  <Icon className="size-[20px] shrink-0" strokeWidth={2} />
                  <span
                    className={`
                      overflow-hidden transition-[max-width,opacity,margin] duration-[550ms]
                      ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none
                      ${isActive ? 'ml-1.5 max-w-[110px] opacity-100' : 'ml-0 max-w-0 opacity-0'}
                    `}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
