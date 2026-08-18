import { TECNOLOGIAS } from "./datos/tecnologias";
import type { Estado, Jugador } from "./tipos";

const TOTAL_TECS = Object.keys(TECNOLOGIAS).length;   // |T| = 6

/** ec. 3.33 — combinación convexa de cuatro cocientes normalizados. */
export function calcularPuntuacion(st: Estado, j: Jugador): number {
  const P = st.params;
  const N = st.provincias.length;

  const nj = st.provincias.filter((p) => p.c === j.id).length;
  const pobJ = st.provincias.reduce((s, p) => s + (p.c === j.id ? p.Pob : 0), 0);
  const pobTot = st.provincias.reduce((s, p) => s + (p.c >= 0 ? p.Pob : 0), 0);

  let sJ = 0, sTot = 0;
  for (const e of st.ejercitos.values()) {
    if (!e.vivo || e.jugador < 0) continue;
    sTot += e.S;
    if (e.jugador === j.id) sJ += e.S;
  }

  return 100 * (
      P.wP * (N > 0 ? nj / N : 0)
    + P.wH * (pobTot > 0 ? pobJ / pobTot : 0)
    + P.wS * (sTot > 0 ? sJ / sTot : 0)
    + P.wT * (j.tecnologias.size / TOTAL_TECS)
  );
}

/**
 * §3.9 — evalúa las tres condiciones EN ORDEN dentro de FIN_TURNO.
 * Muta st.fin si alguna se cumple.
 */
export function evaluarVictoria(st: Estado): void {
  if (st.fin) return;

  for (const j of st.jugadores) j.V = calcularPuntuacion(st, j);
  const activos = st.jugadores.filter((j) => j.activo);

  // Desempate determinista: mayor V, y a igualdad el de menor id.
  const mejor = activos.reduce((a, b) => (b.V > a.V ? b : a), activos[0]);

  if (activos.length === 1) {
    st.fin = { t: st.t, ganador: activos[0].id, motivo: "dominacion" };
    return;
  }
  if (mejor && mejor.V >= st.params.thetaV) {
    st.fin = { t: st.t, ganador: mejor.id, motivo: "puntuacion" };
    return;
  }
  if (st.t >= st.params.tMax) {
    st.fin = { t: st.t, ganador: mejor ? mejor.id : -1, motivo: "horizonte" };
  }
}
