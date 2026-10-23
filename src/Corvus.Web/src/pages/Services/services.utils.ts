import type { Service } from '../../api/client';

export interface TagCount {
  tag: string;
  count: number;
}

/** Servis etiketlerini sayar; çoktan aza, eşitlikte alfabetik sıralar. */
export const countServiceTags = (services: Service[]): TagCount[] => {
  const counts = new Map<string, number>();
  services.forEach((s) => {
    s.tags?.forEach((tag) => {
      const clean = tag.trim();
      if (clean) {
        counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    });
  });
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

/** Servisleri arama metni, seçili etiket ve durum filtresine göre süzer. */
export const filterServices = (
  services: Service[],
  search: string,
  selectedTag: string | null,
  selectedStatus: string | null
): Service[] => {
  return services.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesTag =
      !selectedTag ||
      (s.tags && s.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

    const matchesStatus = !selectedStatus || s.status === selectedStatus;

    return matchesSearch && matchesTag && matchesStatus;
  });
};
