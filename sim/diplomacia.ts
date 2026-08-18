import { clamp } from "./redondeo";
import type { Estado, Jugador, Provincia } from "./tipos";

export const enGuerra = (st: Estado, a: number, b: number): boolean =>
  a !== b && st.relaciones[a][b] <= st.params.rGuerra;

/** R es simétrica (errata §5.5 del spec): siempre se actualizan ambas celdas. */
export function ajustarRelacion(st: Estado, a: number, b: number, delta: number): void {
  if (a === b) return;
  const v = clamp(st.relaciones[a][b] + delta, -100, 100);
  st.relaciones[a][b] = v;
  st.relaciones[b][a] = v;
}

export function declararGuerra(st: Estado, a: number, b: number): void {
  if (a === b) return;
  st.relaciones[a][b] = st.params.rGuerra;
  st.relaciones[b][a] = st.params.rGuerra;
}

const fronterasCompartidas = (st: Estado, a: number, b: number): number => {
  let f = 0;
  for (const p of st.provincias)
    if (p.c === a) for (const v of p.vecinos) if (st.provincias[v].c === b) f++;
  return f;
};

/**
 * ec. 3.30 — deriva hacia la neutralidad y fricción por frontera.
 * En guerra R queda congelado en −100 y sólo lo libera un acuerdo ratificado
 * (§5.5 del spec): no se aplica ni deriva ni fricción.
 */
export function actualizarRelaciones(st: Estado, j: Jugador): void {
  for (const otro of st.jugadores) {
    if (otro.id === j.id || !otro.activo) continue;
    if (enGuerra(st, j.id, otro.id)) continue;
    const R = st.relaciones[j.id][otro.id];
    const deriva = st.params.nu * (0 - R);
    const friccion = st.params.zeta * fronterasCompartidas(st, j.id, otro.id);
    const v = clamp(R + deriva - friccion, -100, 100);
    st.relaciones[j.id][otro.id] = v;
    st.relaciones[otro.id][j.id] = v;
  }
}

/** ecs. 3.31 y 3.32 — lealtad provincial con bonificación por guarnición. */
export function actualizarLealtad(st: Estado, p: Provincia, sj: number): void {
  if (p.c === -1) return;
  const P = st.params;

  let guarnicion = 0;
  for (const e of st.ejercitos.values())
    if (e.vivo && e.u === p.id && e.jugador === p.c) guarnicion += e.S;

  // ec. 3.32 — un soldado por cada cien habitantes da la bonificación completa.
  const g = p.Pob > 0
    ? P.zetaM * Math.min(1, guarnicion / (0.01 * p.Pob))
    : P.zetaM;

  const guerra = st.jugadores.some(
    (o) => o.activo && o.id !== p.c && enGuerra(st, p.c, o.id)) ? 1 : 0;

  p.lealtad = clamp(
    p.lealtad
      + P.rhoLambda * (P.lambdaEq - p.lealtad)
      - P.zetaG * guerra
      - P.zetaH * 100 * sj
      + g,
    0, 100);
}

/**
 * ec. 5.2 — transición de estado, en orden de precedencia, con histéresis.
 * La banda muerta [Λ_crit, Λ_rec) = [25, 40) impide que una provincia oscilando
 * alrededor de 25 cambie de estado en turnos alternos.
 */
export function transicionEstado(st: Estado, p: Provincia): void {
  const hayEnemigo = [...st.ejercitos.values()].some(
    (e) => e.vivo && e.S > 0 && e.u === p.id && e.jugador !== p.c);

  if (hayEnemigo) { p.estado = "asediada"; return; }
  if (p.lealtad < st.params.lambdaCrit) { p.estado = "rebelde"; return; }
  if (p.estado === "rebelde" && p.lealtad >= st.params.lambdaRec) {
    p.estado = "normal"; return;
  }
  if (p.estado === "asediada") p.estado = "normal";   // el asedio se levantó
}
