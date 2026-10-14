import type { LucideIcon } from 'lucide-react';

export type CommandCategory = 'pages' | 'actions' | 'containers' | 'services' | 'commands';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  icon: LucideIcon;
  shortcut?: string;
  onSelect: () => void;
}
