import type { Celda, Corrida } from "./tipos";

/**
 * t(29; 0,975) = 2,045. El diseño del §7 fija R = 30 réplicas, así que los
 * grados de libertad son constantes y no hace falta una tabla completa.
 */
export const T_CRITICO_29 = 2.045;

/** ecs. 3.34, 3.35 y 3.37 sobre las réplicas de una celda del factorial. */
export function resumirCelda(corridas: Corrida[]): Celda {
  const n = corridas.length;
  if (n === 0) throw new Error("resumirCelda: celda sin réplicas");

  const media = corridas.reduce((s, c) => s + c.tVic, 0) / n;          // ec. 3.34
  const varianza = n > 1
    ? corridas.reduce((s, c) => s + (c.tVic - media) ** 2, 0) / (n - 1)
    : 0;

  // ec. 3.35 — con R = 30 el valor crítico es t(29; 0,975).
  const semi = n > 1 ? T_CRITICO_29 * Math.sqrt(varianza) / Math.sqrt(n) : 0;

  // ec. 3.37 — cociente de las sumas, NO promedio de cocientes por réplica:
  // el denominador cuenta a todos los jugadores que llegaron a ser grandes.
  const colapsados = corridas.reduce((s, c) => s + c.colapsados, 0);
  const llegaronA40 = corridas.reduce((s, c) => s + c.llegaronA40, 0);

  return {
    nJugadores: corridas[0].nJugadores,
    gamma: corridas[0].gamma,
    n,
    mediaTVic: media,
    varianzaTVic: varianza,
    ic95: [media - semi, media + semi],
    // §5.3: si esta fracción es alta, la media de tVic está censurada.
    fraccionHorizonte: corridas.filter((c) => c.motivo === "horizonte").length / n,
    colapsados,
    llegaronA40,
    tasaColapso: llegaronA40 > 0 ? colapsados / llegaronA40 : null,
  };
}
