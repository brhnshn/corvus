import { useState, useMemo } from 'react';
import type { DockerContainer } from '../../../api/client';
import { extractContainerTags } from '../utils/containerTags';

export function useContainerFilters(containers: DockerContainer[]) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'compose'>('flat');

  const tagsWithCounts = useMemo(() => {
    if (!Array.isArray(containers)) return [];
    const counts: Record<string, number> = {};
    for (const c of containers) {
      if (!c) continue;
      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels || {});
      for (const t of tags) {
        if (!t) continue;
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [containers]);

  const filteredContainers = useMemo(() => {
    if (!Array.isArray(containers)) return [];
    return containers.filter((c) => {
      if (!c) return false;
      const rawName = c.Names?.[0] || c.Id || 'unknown';
      const cleanName = (rawName || '').replace(/^\//, '').toLowerCase();
      const image = (c.Image || '').toLowerCase();
      const q = (search || '').toLowerCase().trim();

      const hasPort = c.Ports?.some(
        (p) =>
          (p?.PrivatePort != null && String(p.PrivatePort).includes(q)) ||
          (p?.PublicPort != null && String(p.PublicPort).includes(q))
      ) ?? false;

      const matchesSearch = !q || cleanName.includes(q) || image.includes(q) || hasPort;

      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels || {});
      const matchesTag =
        !selectedTag || tags.some((t) => (t || '').toLowerCase() === selectedTag.toLowerCase());

      const state = (c.State || 'unknown').toLowerCase();
      const matchesState =
        !selectedState ||
        (selectedState === 'running' && state === 'running') ||
        (selectedState === 'paused' && state === 'paused') ||
        (selectedState === 'stopped' && ['exited', 'dead', 'created'].includes(state));

      return matchesSearch && matchesTag && matchesState;
    });
  }, [containers, search, selectedTag, selectedState]);

  return {
    search,
    setSearch,
    selectedTag,
    setSelectedTag,
    selectedState,
    setSelectedState,
    viewMode,
    setViewMode,
    tagsWithCounts,
    filteredContainers,
  };
}
