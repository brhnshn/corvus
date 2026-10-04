/**
 * Deterministic tag hue generator as specified in Corvus Midnight Design Language v2.
 * Hashes a tag name into a fixed HSL hue angle (0-359).
 */
export function tagHue(name: string): number {
  if (!name) return 0;
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

export function getTagStyle(name: string) {
  const h = tagHue(name);
  return {
    color: `hsl(${h} 85% 72%)`,
    backgroundColor: `hsl(${h} 60% 50% / 0.16)`,
    borderColor: `hsl(${h} 70% 55% / 0.25)`,
    dotColor: `hsl(${h} 80% 65%)`
  };
}
