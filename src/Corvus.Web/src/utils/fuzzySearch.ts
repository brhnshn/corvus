/**
 * Hafif, sıfır bağımlılıklı bulanık arama (fuzzy-like scoring) fonksiyonu.
 */
export function fuzzyMatch(pattern: string, text: string): { match: boolean; score: number } {
  const p = pattern.trim().toLowerCase();
  const t = text.toLowerCase();

  if (!p) return { match: true, score: 0 };
  if (t.includes(p)) {
    // Tam alt metin eşleşmesi en yüksek skoru alır
    const idx = t.indexOf(p);
    return { match: true, score: 100 - idx };
  }

  // Karakter sırasıyla eşleştirme
  let pIdx = 0;
  let score = 0;
  for (let i = 0; i < t.length && pIdx < p.length; i++) {
    if (t[i] === p[pIdx]) {
      pIdx++;
      score += 5;
    }
  }

  return { match: pIdx === p.length, score };
}
