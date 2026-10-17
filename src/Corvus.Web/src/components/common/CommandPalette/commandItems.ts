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
  Terminal,
  ExternalLink,
  History,
  Trash2,
  Server
} from 'lucide-react';
import type { CommandItem } from './types';
import type { PageId } from '../../Sidebar';
import { api, invalidateCache } from '../../../api';

interface GenerateCommandItemsOptions {
  t: (key: any, params?: any) => string;
  onNavigate: (page: PageId, containerId?: string | null, tab?: string | null) => void;
  onRefreshData?: () => void;
  toast?: {
    success: (msg: string, onUndo?: () => void) => void;
    warn: (msg: string, onUndo?: () => void) => void;
    error: (msg: string, onUndo?: () => void) => void;
    info: (msg: string, onUndo?: () => void) => void;
  };
}

export async function fetchCommandItems({
  t,
  onNavigate,
  onRefreshData,
  toast,
}: GenerateCommandItemsOptions): Promise<CommandItem[]> {
  const items: CommandItem[] = [
    // Sayfalar
    {
      id: 'page-dashboard',
      title: t('nav.dashboard'),
      category: 'pages',
      icon: LayoutDashboard,
      shortcut: 'G D',
      onSelect: () => onNavigate('dashboard'),
    },
    {
      id: 'page-services',
      title: t('nav.services'),
      category: 'pages',
      icon: Grid,
      shortcut: 'G S',
      onSelect: () => onNavigate('services'),
    },
    {
      id: 'page-containers',
      title: t('nav.containers'),
      category: 'pages',
      icon: Boxes,
      shortcut: 'G C',
      onSelect: () => onNavigate('containers'),
    },
    {
      id: 'page-metrics',
      title: t('nav.metrics'),
      category: 'pages',
      icon: Activity,
      shortcut: 'G M',
      onSelect: () => onNavigate('metrics'),
    },
    {
      id: 'page-uptime',
      title: t('nav.uptime'),
      category: 'pages',
      icon: Clock,
      shortcut: 'G U',
      onSelect: () => onNavigate('uptime'),
    },
    {
      id: 'page-activity',
      title: t('commandPalette.activityLog'),
      category: 'pages',
      icon: History,
      shortcut: 'G A',
      onSelect: () => onNavigate('activity'),
    },
    {
      id: 'page-settings',
      title: t('nav.settings'),
      category: 'pages',
      icon: Settings,
      shortcut: 'G ,',
      onSelect: () => onNavigate('settings'),
    },
    {
      id: 'page-profile',
      title: t('nav.profile'),
      category: 'pages',
      icon: UserIcon,
      shortcut: 'G P',
      onSelect: () => onNavigate('profile'),
    },

    // Global Aksiyonlar
    {
      id: 'action-refresh',
      title: t('commandPalette.refreshAll'),
      category: 'actions',
      icon: RotateCw,
      shortcut: 'R',
      onSelect: () => {
        if (onRefreshData) onRefreshData();
      },
    },
    {
      id: 'action-prune',
      title: t('commandPalette.dockerPrune'),
      category: 'actions',
      icon: Trash2,
      onSelect: () => {
        onNavigate('containers', null, 'prune');
      },
    },
    {
      id: 'action-status',
      title: t('commandPalette.openStatusPage'),
      category: 'actions',
      icon: ExternalLink,
      onSelect: () => {
        window.open('/status', '_blank');
      },
    },
  ];

  // 1. Konteynerleri API'den dinamik olarak çek ve komutları ekle
  try {
    const containers = await api.getContainers();
    containers.forEach((c) => {
      const name = c.Names?.[0]?.replace(/^\//, '') || c.Id.substring(0, 12);
      const isRunning = c.State === 'running';

      // Temel konteyner gezinme öğesi
      items.push({
        id: `container-${c.Id}`,
        title: name,
        subtitle: `${c.Image} • ${c.Status}`,
        category: 'containers',
        icon: isRunning ? Boxes : Play,
        onSelect: () => onNavigate('containers', c.Id),
      });

      // Modül 3.1: > restart <container_name> (Geri Al / Undo destekli)
      items.push({
        id: `cmd-restart-${c.Id}`,
        title: `> restart ${name}`,
        subtitle: t('commandPalette.restartDesc'),
        category: 'commands',
        icon: RotateCw,
        onSelect: async () => {
          try {
            await api.restartContainer(c.Id);
            invalidateCache('/containers');
            invalidateCache('/dashboard');
            toast?.info(
              t('commandPalette.containerRestarted', { name }),
              async () => {
                try {
                  await api.stopContainer(c.Id);
                  invalidateCache('/containers');
                  invalidateCache('/dashboard');
                  toast?.warn(t('commandPalette.containerUndone', { name }));
                } catch (undoErr) {
                  console.error('Failed to undo container restart', undoErr);
                }
              }
            );
          } catch (err: unknown) {
            console.error('Failed to restart container', err);
            toast?.error(t('commandPalette.restartFailed', { error: err instanceof Error ? err.message : String(err) }));
          }
        },
      });

      // Modül 3.1: > logs <container_name> (Doğrudan SSE log modalını aç)
      items.push({
        id: `cmd-logs-${c.Id}`,
        title: `> logs ${name}`,
        subtitle: t('commandPalette.logsDesc'),
        category: 'commands',
        icon: Terminal,
        onSelect: () => onNavigate('containers', c.Id, 'logs'),
      });
    });
  } catch {
    // Konteynerler çekilemezse devam et
  }

  // 2. Sistem Düğümlerini Çek ve > switch <system_name> komutlarını ekle
  try {
    const systems = await api.getSystems();
    if (Array.isArray(systems)) {
      systems.forEach((s) => {
        items.push({
          id: `cmd-switch-${s.id}`,
          title: `> switch ${s.name}`,
          subtitle: `${t('commandPalette.switchDesc')} (${s.ipAddress || s.hostname || s.id.substring(0, 8)})`,
          category: 'commands',
          icon: Server,
          onSelect: () => {
            try {
              localStorage.setItem('corvus_active_system_id', s.id);
              window.dispatchEvent(new CustomEvent('corvus_system_switch', { detail: s }));
              onNavigate('systems', s.id);
              toast?.success(t('commandPalette.switchedToSystem', { name: s.name }));
            } catch (err) {
              console.error('Failed to switch system', err);
            }
          },
        });
      });
    }
  } catch {
    // Sistemler çekilemezse devam et
  }

  // 3. Servisleri Çek ve > check <service_name> anlık HTTP/TCP yoklamasını ekle
  try {
    const services = await api.getServices();
    if (Array.isArray(services)) {
      services.forEach((s) => {
        items.push({
          id: `cmd-check-${s.id}`,
          title: `> check ${s.name}`,
          subtitle: `${t('commandPalette.checkDesc')} (${s.checkType || 'HTTP'})`,
          category: 'commands',
          icon: Activity,
          onSelect: async () => {
            toast?.info(t('commandPalette.checking'));
            try {
              const res = await api.testConnection({
                url: s.url,
                port: s.port,
                checkType: s.checkType,
                ignoreTls: s.ignoreTls,
                timeoutSeconds: 5
              });
              if (res.success) {
                toast?.success(t('commandPalette.serviceCheckSuccess', { 
                  name: s.name, 
                  latency: res.responseTimeMs ?? 0 
                }));
              } else {
                toast?.warn(t('commandPalette.serviceCheckFailed', { 
                  name: s.name, 
                  message: res.message || t('commandPalette.noResponse') 
                }));
              }
            } catch (err: unknown) {
              toast?.error(t('commandPalette.serviceCheckFailed', { 
                name: s.name, 
                message: err instanceof Error ? err.message : String(err) 
              }));
            }
          },
        });
      });
    }
  } catch {
    // Servisler çekilemezse devam et
  }

  return items;
}
