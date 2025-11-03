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
    // Added assets present in the repository (match filenames in assets/sounds/*.mp3)
    { id: 'Alvida Neve', title: 'Alvida Neve', artist: 'Vários Artistas', unlock: { minLevel: 1 } },
    { id: 'Correnteza Tranquila', title: 'Correnteza Tranquila', artist: 'Vários Artistas', unlock: { minCycles: 2 } },
    { id: 'Focus Flow', title: 'Focus Flow', artist: 'Vários Artistas', unlock: { minLevel: 2 } },
    { id: 'Focus Flow 2', title: 'Focus Flow 2', artist: 'Vários Artistas', unlock: { minCycles: 3 } },
    { id: 'Focus Now', title: 'Focus Now', artist: 'Vários Artistas', unlock: { minLevel: 1 } },
    { id: 'Focus Now 2', title: 'Focus Now 2', artist: 'Vários Artistas', unlock: { minCycles: 3 } },
    { id: 'Mar Aberto', title: 'Mar Aberto', artist: 'Vários Artistas', unlock: { minLevel: 2 } },
    { id: 'More Five Minutes', title: 'More Five Minutes', artist: 'Vários Artistas', unlock: { minCycles: 2 } },
    { id: 'Quietude do Inverno', title: 'Quietude do Inverno', artist: 'Vários Artistas', unlock: { minLevel: 3 } },
    { id: 'Snowfall in Silence', title: 'Snowfall in Silence', artist: 'Vários Artistas', unlock: { minCycles: 4 } },
    { id: 'Snowfall Serenity', title: 'Snowfall Serenity', artist: 'Vários Artistas', unlock: { minLevel: 4 } },
    { id: 'Take Five Minutes', title: 'Take Five Minutes', artist: 'Vários Artistas', unlock: { minCycles: 2 } },
    { id: 'Vale Sussurante', title: 'Vale Sussurante', artist: 'Vários Artistas', unlock: { minLevel: 2 } },
    { id: 'Vale Sussurante 2', title: 'Vale Sussurante 2', artist: 'Vários Artistas', unlock: { minLevel: 6 } },
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
