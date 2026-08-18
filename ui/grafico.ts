/**
 * Colores de jugador. Elegidos para distinguirse también en escala de grises,
 * porque el informe puede imprimirse en blanco y negro: los tonos alternan
 * claro y oscuro en vez de agruparse por matiz.
 */
export const COLORES_JUGADOR = [
  "#1d4ed8", "#ea580c", "#15803d", "#a21caf",
  "#0891b2", "#b45309", "#4d7c0f", "#be123c",
];

const ANCHO = 640, ALTO = 220, M = { arriba: 12, derecha: 12, abajo: 24, izquierda: 40 };

/**
 * Territorio de cada jugador a lo largo de la partida (§6).
 * Las líneas de 40 % y 20 % son los umbrales de la ec. 3.36: cruzar el primero
 * y después caer bajo el segundo es la definición de colapso.
 */
export function graficoTerritorio(series: number[][]): string {
  const x0 = M.izquierda, x1 = ANCHO - M.derecha;
  const y0 = M.arriba, y1 = ALTO - M.abajo;

  const turnos = Math.max(1, ...series.map((s) => s.length));
  // Escala al máximo observado, con piso en 0,5: si escalara siempre a 1, las
  // partidas donde nadie pasa del 10 % se verían como líneas planas.
  const techo = Math.max(0.5, ...series.flat());

  const px = (i: number) => x0 + (turnos <= 1 ? 0 : (i / (turnos - 1)) * (x1 - x0));
  const py = (v: number) => y1 - (v / techo) * (y1 - y0);

  const umbral = (v: number, texto: string) => `
    <line x1="${x0}" y1="${py(v)}" x2="${x1}" y2="${py(v)}"
          stroke="#cbd5e1" stroke-dasharray="3 3" />
    <text x="${x0 - 6}" y="${py(v) + 4}" text-anchor="end"
          font-size="11" fill="#64748b">${texto}</text>`;

  const lineas = series.map((s, j) => {
    if (s.length === 0) return "";
    const puntos = s.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
    return `<polyline points="${puntos}" fill="none" stroke-width="1.75"
              stroke="${COLORES_JUGADOR[j % COLORES_JUGADOR.length]}" />`;
  }).join("");

  return `<svg viewBox="0 0 ${ANCHO} ${ALTO}" width="100%" role="img"
    aria-label="Fracción del mapa controlada por cada jugador a lo largo de la partida">
    <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="#94a3b8" />
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="#94a3b8" />
    ${umbral(0.4, "40 %")}
    ${umbral(0.2, "20 %")}
    ${lineas}
    <text x="${x1}" y="${ALTO - 6}" text-anchor="end" font-size="11" fill="#64748b">turno ${turnos}</text>
  </svg>`;
}
