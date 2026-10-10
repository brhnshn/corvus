import type { LucideIcon } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'pages' | 'actions' | 'containers' | 'services';
  icon: LucideIcon;
  shortcut?: string;
  onSelect: () => void;
}
