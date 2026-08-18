import type { Corrida } from "./tipos";

const COLUMNAS = [
  "nJugadores", "gamma", "semilla", "tVic", "ganador", "motivo",
  "colapsados", "llegaronA40",
] as const;

/**
 * Una fila por corrida. Punto decimal y separador coma: es lo que esperan
 * Excel en configuración inglesa, R y Minitab. El CSV existe para poder
 * rehacer el análisis fuera de esta app y contrastar el ANOVA propio (§7).
 */
export function aCSV(corridas: Corrida[]): string {
  const filas = corridas.map((c) =>
    [c.nJugadores, c.gamma, c.semilla, c.tVic, c.ganador, c.motivo,
     c.colapsados, c.llegaronA40].join(","));
  return [COLUMNAS.join(","), ...filas].join("\n") + "\n";
}
