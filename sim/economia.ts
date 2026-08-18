import { clamp, ganancia } from "./redondeo";   // `perdida` no se usa acá: noUnusedLocals está en true
import { MEJORAS } from "./datos/mejoras";
import type { Estado, EstadoProv, Jugador, Provincia } from "./tipos";

/** ec. 5.1 — factor de operatividad. 1 normal, 0 asediada, 0,25 rebelde. */
export function etaOperatividad(estado: EstadoProv): number {
  if (estado === "normal") return 1;
  if (estado === "asediada") return 0;
  return 0.25;
}

/** b_i^E y b_i^F: suma de los beneficios de las mejoras construidas. §2.3 */
export function bonos(p: Provincia): { bE: number; bF: number } {
  let bE = 0, bF = 0;
  for (const m of p.mejoras) { bE += MEJORAS[m].bE; bF += MEJORAS[m].bF; }
  return { bE, bF };
}

const propias = (st: Estado, j: Jugador): Provincia[] =>
  st.provincias.filter((p) => p.c === j.id);

const efectivos = (st: Estado, j: Jugador): number => {
  let s = 0;
  for (const e of st.ejercitos.values()) if (e.vivo && e.jugador === j.id) s += e.S;
  return s;
};

/**
 * ec. 3.3 — producción de alimento.
 * Errata §5.3 del spec: el §5.1 del modelo exige A_i = 0 con Pob_i = 0, aunque
 * la ec. 3.3 no lleve término de población. Sin esto la hambruna se auto-cura.
 */
export function produccion(st: Estado, j: Jugador): number {
  let total = 0;
  for (const p of propias(st, j)) {
    if (p.Pob === 0) continue;
    total += p.a * (1 + bonos(p).bF) * (1 + j.betaEco) * etaOperatividad(p.estado);
  }
  return total;
}

/** ec. 3.4 — consumo civil + militar. */
export function consumo(st: Estado, j: Jugador): number {
  const pob = propias(st, j).reduce((s, p) => s + p.Pob, 0);
  return st.params.alpha * pob + st.params.sigma * efectivos(st, j);
}

/**
 * ec. 3.7 — ingreso fiscal.
 * a_i^E entra como multiplicador de riqueza: errata §5.4 del spec (sin él, el
 * evento «descubrimiento de oro» del §3.6.3 no daría oro).
 */
export function ingreso(st: Estado, j: Jugador): number {
  let total = 0;
  for (const p of propias(st, j))
    total += st.params.tau * p.Pob * p.aE * (1 + bonos(p).bE)
           * (1 + j.betaEco) * etaOperatividad(p.estado);
  return total;
}

/** ec. 3.8 — gasto corriente con sobrecarga administrativa κ·n_j/N. */
export function gasto(st: Estado, j: Jugador): number {
  const ps = propias(st, j);
  const N = st.provincias.length;
  const militar = st.params.gamma * efectivos(st, j)
                * (1 + st.params.kappa * ps.length / N);
  const mejoras = ps.reduce(
    (s, p) => s + p.mejoras.reduce((m, id) => m + MEJORAS[id].mu, 0), 0);
  return militar + mejoras;
}

/**
 * ecs. 3.5 y 3.6 — resuelve el balance alimentario y devuelve s_j.
 * Muta j.F. El balance se calcula sin restricción de signo para poder medir el
 * déficit, y sólo después se satura.
 */
export function balanceAlimentario(st: Estado, j: Jugador): number {
  const A = produccion(st, j);
  const C = consumo(st, j);
  const tilde = j.F + A - C;                       // ec. 3.5
  j.F = Math.max(0, ganancia(tilde));
  if (C <= 0) return 0;                            // convenio §5.3: evita 0/0
  return clamp(Math.max(0, -tilde) / C, 0, 1);     // ec. 3.6
}

/**
 * ec. 5.4 — protocolo de quiebra. Disuelve ejércitos por orden de costo hasta
 * equilibrar; si persiste, condona la deuda. Devuelve 1 si hubo quiebra.
 * Termina siempre: cada iteración elimina un ejército de un conjunto finito.
 */
export function verificarQuiebra(st: Estado, j: Jugador): number {
  if (j.E >= 0) return 0;

  for (;;) {
    if (j.E >= 0) break;
    let peor = null as null | { id: number; S: number };
    for (const e of st.ejercitos.values())
      if (e.vivo && e.jugador === j.id && (peor === null || e.S > peor.S))
        peor = { id: e.id, S: e.S };
    if (peor === null) break;

    j.E += ganancia(st.params.varpi * st.params.cR * peor.S);
    st.ejercitos.get(peor.id)!.vivo = false;
  }

  if (j.E < 0) j.E = 0;   // deuda condonada; la penalización δ_Q la aplica moral.ts
  return 1;
}
