export type TipoEvento =
  | "INICIO_TURNO" | "EVENTO_ALEATORIO" | "DECISION_JUGADOR"
  | "INICIO_MOVIMIENTO" | "INICIO_CONSTRUCCION" | "INICIO_ENTRENAMIENTO"
  | "PROPUESTA_ACUERDO" | "LLEGADA_DESTINO" | "BATALLA"
  | "CONQUISTA_PROVINCIA" | "MEJORA_COMPLETADA" | "TECNOLOGIA_COMPLETADA"
  | "TROPAS_LISTAS" | "ACUERDO_RATIFICADO" | "FIN_TURNO";

/** Clases de prioridad de la tabla del §4.1. Resuelven la simultaneidad. */
export const P = {
  INICIO_TURNO: 0,
  EVENTO_ALEATORIO: 1,
  DECISION_JUGADOR: 2,
  ACTIVIDAD: 3,        // INICIO_MOVIMIENTO / CONSTRUCCION / ENTRENAMIENTO / PROPUESTA
  LLEGADA_DESTINO: 4,
  BATALLA: 5,
  CONQUISTA: 6,
  COMPLETADO: 7,       // MEJORA / TECNOLOGIA / TROPAS / ACUERDO
  FIN_TURNO: 8,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Evento = { t: number; p: number; sec: number; tipo: TipoEvento; datos: any };

/**
 * El contador `sec` vive acá y no en el módulo: si fuera global, las 270
 * corridas del batch (§7) compartirían contador y la segunda no reproduciría
 * a la primera con la misma semilla.
 */
export type LEF = { heap: Evento[]; sec: number };

export const crearLEF = (): LEF => ({ heap: [], sec: 0 });
export const vacia = (lef: LEF): boolean => lef.heap.length === 0;

/** Orden lexicográfico sobre (t, p, sec). §4.1 */
function antes(a: Evento, b: Evento): boolean {
  if (a.t !== b.t) return a.t < b.t;
  if (a.p !== b.p) return a.p < b.p;
  return a.sec < b.sec;
}

export function insertar(
  lef: LEF, t: number, p: number, tipo: TipoEvento, datos: unknown,
): void {
  const e: Evento = { t, p, sec: lef.sec++, tipo, datos };
  const h = lef.heap;
  h.push(e);
  let i = h.length - 1;
  while (i > 0) {
    const padre = (i - 1) >> 1;
    if (!antes(h[i], h[padre])) break;
    [h[i], h[padre]] = [h[padre], h[i]];
    i = padre;
  }
}

export function extraerMin(lef: LEF): Evento | null {
  const h = lef.heap;
  if (h.length === 0) return null;
  const min = h[0];
  const ultimo = h.pop()!;
  if (h.length > 0) {
    h[0] = ultimo;
    let i = 0;
    for (;;) {
      const izq = 2 * i + 1, der = 2 * i + 2;
      let menor = i;
      if (izq < h.length && antes(h[izq], h[menor])) menor = izq;
      if (der < h.length && antes(h[der], h[menor])) menor = der;
      if (menor === i) break;
      [h[i], h[menor]] = [h[menor], h[i]];
      i = menor;
    }
  }
  return min;
}
