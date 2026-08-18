export type ProvinciaDato = {
  id: number; nombre: string; vecinos: number[];
  K: number; a: number; D: number; aE: number;
};

const NOMBRES = [
  "Aldrek", "Bryn", "Corvath", "Dunmar", "Eldis",
  "Falkir", "Gwyneth", "Harek", "Ithra", "Jorund",
  "Kaldan", "Lyrion", "Mereth", "Nordvik", "Ostheim",
  "Perrin", "Quenmar", "Rhoswen", "Sarnath", "Tirion",
  "Ulric", "Valdris", "Wendel", "Xanthe", "Ysolde",
];

/** Puentes que rompen la regularidad de la retícula y crean cuellos de botella. */
const PUENTES: [number, number][] = [
  [0, 6], [4, 8], [20, 16], [24, 18], [10, 16], [14, 18],
];

const CENTRO = 12;
const INTERIOR = new Set([6, 7, 8, 11, 13, 16, 17, 18]);

function anillo(i: number): { K: number; a: number; D: number; aE: number } {
  if (i === CENTRO)     return { K: 20_000, a: 60, D: 5,  aE: 1.5 };
  if (INTERIOR.has(i))  return { K: 14_000, a: 40, D: 10, aE: 1.2 };
  return                       { K:  7_000, a: 22, D: 25, aE: 1.0 };
}

function construir(): ProvinciaDato[] {
  const vecinos: Set<number>[] = Array.from({ length: 25 }, () => new Set<number>());
  // Retícula 5×5, adyacencia ortogonal.
  for (let i = 0; i < 25; i++) {
    const fila = Math.floor(i / 5), col = i % 5;
    if (col > 0) { vecinos[i].add(i - 1); vecinos[i - 1].add(i); }
    if (fila > 0) { vecinos[i].add(i - 5); vecinos[i - 5].add(i); }
  }
  for (const [a, b] of PUENTES) { vecinos[a].add(b); vecinos[b].add(a); }

  return Array.from({ length: 25 }, (_, i) => ({
    id: i,
    nombre: NOMBRES[i],
    vecinos: [...vecinos[i]].sort((x, y) => x - y),
    ...anillo(i),
  }));
}

export const MAPA25: ProvinciaDato[] = construir();

/**
 * Capitales por número de jugadores, elegidas de borde y lo más separadas
 * posible. Tabla explícita en vez de heurística: es reproducible y testeable.
 */
export const CAPITALES: Record<number, number[]> = {
  3: [0, 4, 22],
  5: [0, 4, 24, 20, 10],
  8: [0, 2, 4, 10, 14, 20, 22, 24],
};

/** Matriz de caminos más cortos por BFS. Alimenta dist(k,i) de la ec. 4.4. */
export function distancias(mapa: ProvinciaDato[]): number[][] {
  const n = mapa.length;
  return mapa.map((origen) => {
    const d = Array(n).fill(Infinity);
    d[origen.id] = 0;
    const cola = [origen.id];
    for (let i = 0; i < cola.length; i++) {
      const actual = cola[i];
      for (const v of mapa[actual].vecinos)
        if (d[v] === Infinity) { d[v] = d[actual] + 1; cola.push(v); }
    }
    return d;
  });
}
