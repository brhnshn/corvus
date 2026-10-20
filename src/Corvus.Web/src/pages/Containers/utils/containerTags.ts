export function extractContainerTags(labels?: Record<string, string>): string[] {
  if (!labels) return [];
  const tags: string[] = [];
  if (labels['corvus.tags']) {
    tags.push(...labels['corvus.tags'].split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (labels['environment']) tags.push(labels['environment'].trim());
  else if (labels['env']) tags.push(labels['env'].trim());
  if (labels['com.docker.compose.project']) tags.push(labels['com.docker.compose.project'].trim());
  return Array.from(new Set(tags));
}
