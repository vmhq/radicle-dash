/** Deterministic 32-bit hash (FNV-1a). */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic gradient palette derived from a seed string. */
export function gradientFromSeed(seed: string): {
  from: string;
  via: string;
  to: string;
  cssGradient: string;
} {
  const h = hash32(seed);
  const h1 = h % 360;
  const h2 = (h >>> 8) % 360;
  const h3 = (h >>> 16) % 360;
  const from = `hsl(${h1}, 78%, 62%)`;
  const via = `hsl(${(h1 + (h2 % 80)) % 360}, 70%, 55%)`;
  const to = `hsl(${h3}, 75%, 48%)`;
  return {
    from,
    via,
    to,
    cssGradient: `linear-gradient(135deg, ${from} 0%, ${via} 50%, ${to} 100%)`,
  };
}

/** Two-letter monogram from an alias (uppercase). */
export function monogramFor(alias: string): string {
  if (!alias) return "··";
  const trimmed = alias.trim();
  const tokens = trimmed.split(/[\s_\-./]+/).filter(Boolean);
  if (tokens.length === 0) return trimmed.slice(0, 2).toUpperCase();
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}

/** Compact short form of a long identifier (DID, RID). */
export function shortenId(id: string, head = 12, tail = 6): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}
