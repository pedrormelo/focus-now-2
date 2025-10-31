export interface Track {
  id: string;      // canonical ID used across app and backend
  title: string;   // display title
  artist: string;  // display artist
  unlock?: {       // unlock criteria (server should enforce too)
    minLevel?: number;
    minCycles?: number;
  };
}

export const MUSIC_CATALOG: Track[] = [
  { id: 'Sons da Floresta', title: 'Sons da Floresta', artist: 'Vários Artistas', unlock: { minLevel: 1 } },
  { id: 'Sons de Chuva', title: 'Sons de Chuva', artist: 'Vários Artistas', unlock: { minCycles: 2 } },
  { id: 'Quiet Resource - Evelyn', title: 'Quiet Resource', artist: 'Evelyn Stein', unlock: { minLevel: 2 } },
  { id: 'Saudade - Gabriel Albuquerque', title: 'Saudade', artist: 'Gabriel Albuquerque', unlock: { minLevel: 3 } },
  { id: 'Mix de Frases #1', title: 'Mix de Frases #1', artist: 'Vários Artistas', unlock: { minCycles: 4 } },
  { id: 'Mix de Frases #2', title: 'Mix de Frases #2', artist: 'Vários Artistas', unlock: { minLevel: 4 } },
];

export function getUnlockRulesMap(): Record<string, { minLevel?: number; minCycles?: number }> {
  const map: Record<string, { minLevel?: number; minCycles?: number }> = {};
  for (const t of MUSIC_CATALOG) {
    if (t.unlock) map[t.id] = { ...t.unlock };
  }
  return map;
}

export function getCatalogIds(): string[] {
  return MUSIC_CATALOG.map(t => t.id);
}
