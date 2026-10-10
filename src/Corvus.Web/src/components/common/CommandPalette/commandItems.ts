import { 
  LayoutDashboard, 
  Grid, 
  Boxes, 
  Activity, 
  Clock, 
  Settings, 
  User as UserIcon,
  Play,
  RotateCw,
  FileText,
  Terminal,
  ExternalLink,
  History,
  Trash2
} from 'lucide-react';
import type { CommandItem } from './types';
import type { PageId } from '../../Sidebar';
import { api } from '../../../api/client';

interface GenerateCommandItemsOptions {
  t: (key: any) => string;
  onNavigate: (page: PageId, containerId?: string | null, tab?: string | null) => void;
  onRefreshData?: () => void;
}

export async function fetchCommandItems({
  t,
  onNavigate,
  onRefreshData,
}: GenerateCommandItemsOptions): Promise<CommandItem[]> {
  const items: CommandItem[] = [
    // Sayfalar
    {
      id: 'page-dashboard',
      title: t('nav.dashboard') || 'Genel Bakış',
      category: 'pages',
      icon: LayoutDashboard,
      shortcut: 'G D',
      onSelect: () => onNavigate('dashboard'),
    },
    {
      id: 'page-services',
      title: t('nav.services') || 'Servisler',
      category: 'pages',
      icon: Grid,
      shortcut: 'G S',
      onSelect: () => onNavigate('services'),
    },
    {
      id: 'page-containers',
      title: t('nav.containers') || 'Konteynerler',
      category: 'pages',
      icon: Boxes,
      shortcut: 'G C',
      onSelect: () => onNavigate('containers'),
    },
    {
      id: 'page-metrics',
      title: t('nav.metrics') || 'Sistem Metrikleri',
      category: 'pages',
      icon: Activity,
      shortcut: 'G M',
      onSelect: () => onNavigate('metrics'),
    },
    {
      id: 'page-uptime',
      title: t('nav.uptime') || 'Uptime & SSL',
      category: 'pages',
      icon: Clock,
      shortcut: 'G U',
      onSelect: () => onNavigate('uptime'),
    },
    {
      id: 'page-activity',
      title: 'Olay Geçmişi (Audit Log)',
      category: 'pages',
      icon: History,
      shortcut: 'G A',
      onSelect: () => onNavigate('activity'),
    },
    {
      id: 'page-settings',
      title: t('nav.settings') || 'Ayarlar',
      category: 'pages',
      icon: Settings,
      shortcut: 'G ,',
      onSelect: () => onNavigate('settings'),
    },
    {
      id: 'page-profile',
      title: t('nav.profile') || 'Profil & Kullanıcılar',
      category: 'pages',
      icon: UserIcon,
      shortcut: 'G P',
      onSelect: () => onNavigate('profile'),
    },

    // Global Aksiyonlar
    {
      id: 'action-refresh',
      title: t('common.refresh') || 'Tüm Verileri Yenile',
      category: 'actions',
      icon: RotateCw,
      shortcut: 'R',
      onSelect: () => {
        if (onRefreshData) onRefreshData();
      },
    },
    {
      id: 'action-prune',
      title: 'Docker Temizliği & Hijyen (System Prune)',
      category: 'actions',
      icon: Trash2,
      onSelect: () => {
        onNavigate('containers', null, 'prune');
      },
    },
    {
      id: 'action-status',
      title: t('nav.liveStatus') || 'Canlı Durum Sayfasını Aç (/status)',
      category: 'actions',
      icon: ExternalLink,
      onSelect: () => {
        window.open('/status', '_blank');
      },
    },
  ];

  // Konteynerleri API'den dinamik olarak listeye ekle
  try {
    const containers = await api.getContainers();
    containers.forEach((c) => {
      const name = c.Names?.[0]?.replace(/^\//, '') || c.Id.substring(0, 12);
      const isRunning = c.State === 'running';

      items.push({
        id: `container-${c.Id}`,
        title: name,
        subtitle: `${c.Image} • ${c.Status}`,
        category: 'containers',
        icon: isRunning ? Boxes : Play,
        onSelect: () => onNavigate('containers', c.Id),
      });

      // Hızlı terminal ve log aksiyonları
      if (isRunning) {
        items.push({
          id: `container-logs-${c.Id}`,
          title: `${name} — Canlı Loglar`,
          subtitle: 'Konteyner konsol log akışı',
          category: 'containers',
          icon: FileText,
          onSelect: () => onNavigate('containers', c.Id, 'logs'),
        });
        items.push({
          id: `container-terminal-${c.Id}`,
          title: `${name} — Web Terminali`,
          subtitle: 'Etkileşimli kabuk oturumu (sh/bash)',
          category: 'containers',
          icon: Terminal,
          onSelect: () => onNavigate('containers', c.Id, 'terminal'),
        });
      }
    });
  } catch {
    // Konteynerler çekilemezse temel menü öğeleriyle devam et
  }

  return items;
}
