import { insertar, P as PRIO } from "./lef";
import { MAPA25, distancias } from "./datos/mapa";
import { COSTO_CASTILLO, COSTO_MEJORA } from "./datos/mejoras";
import { consumo, gasto } from "./economia";
import { factorCalidad } from "./combate";
import { declararGuerra, enGuerra, vecinoMasFuerte } from "./diplomacia";
import { iniciarInvestigacion, mejorTecnologia } from "./tecnologia";
import { ganancia } from "./redondeo";
import type { Estado, Jugador } from "./tipos";

const DIST = distancias(MAPA25);
const DIST_MAX = Math.max(...DIST.flat().filter(Number.isFinite));

const calidad = (st: Estado, id: number, atacando: boolean) => {
  const e = st.ejercitos.get(id)!;
  const j = e.jugador >= 0 ? st.jugadores[e.jugador] : null;
  const beta = atacando ? (j?.betaAtk ?? 0) : (j?.betaDef ?? 0);
  return factorCalidad(e, beta, atacando ? 0 : st.provincias[e.u].D);
};

/** ec. 4.2 — razón de fuerzas. max(1, Φ_def) evita la división por cero (§5.3). */
export function razonFuerzas(st: Estado, provId: number, atacante: number): number {
  let phiDef = 0, phiAta = 0;
  for (const e of st.ejercitos.values()) {
    if (!e.vivo || e.S === 0) continue;
    if (e.u === provId && e.jugador !== atacante)
      phiDef += e.S * calidad(st, e.id, false);
    if (e.jugador === atacante && st.provincias[provId].vecinos.includes(e.u))
      phiAta += e.S * calidad(st, e.id, true);
  }
  return phiAta / Math.max(1, phiDef);
}

/** ec. 4.3 — índice de amenaza. Adimensional (errata §5.5 del spec). */
export function amenaza(st: Estado, j: Jugador): number {
  let enemiga = 0, propia = 0;
  const mias = new Set(st.provincias.filter((p) => p.c === j.id).map((p) => p.id));
  for (const e of st.ejercitos.values()) {
    if (!e.vivo || e.S === 0) continue;
    if (e.jugador === j.id) { propia += e.S * calidad(st, e.id, true); continue; }
    if (st.provincias[e.u].vecinos.some((v) => mias.has(v)))
      enemiga += e.S * calidad(st, e.id, true);
  }
  return enemiga / Math.max(1, propia);
}

/** ec. 4.4 — utilidad de atacar la provincia i con el ejército k. */
export function utilidad(st: Estado, j: Jugador, provId: number, ejercitoId: number): number {
  const P = st.params;
  const p = st.provincias[provId];
  const k = st.ejercitos.get(ejercitoId)!;
  const pobMax = Math.max(...st.provincias.map((x) => x.Pob), 1);
  const aMax = Math.max(...st.provincias.map((x) => x.aE), 1);
  const rho = razonFuerzas(st, provId, j.id);

  return P.w1 * (p.Pob / pobMax)
       + P.w2 * (p.aE / aMax)
       + P.w3 * (1 - DIST[k.u][provId] / DIST_MAX)
       + P.w4 * Math.min(1, (rho - P.rhoMin) / P.rhoMin);
}

const misEjercitos = (st: Estado, j: Jugador) =>
  [...st.ejercitos.values()].filter((e) => e.vivo && e.jugador === j.id && e.S > 0);

/**
 * §4.5 — árbol de decisión con guardas ordenadas por prioridad. Se evalúan de
 * arriba abajo y la primera que se cumple determina el modo del turno.
 * Determinista dado el estado: condición necesaria para verificar el simulador.
 */
export function decidirIA(st: Estado, j: Jugador): void {
  const P = st.params;
  const mias = st.provincias.filter((p) => p.c === j.id);
  if (mias.length === 0) return;

  // Se calculan a demanda: FinTurno corre en prioridad 8, esto en la 2 (§5.5).
  const Cj = consumo(st, j);
  const Gj = gasto(st, j);
  const ejs = misEjercitos(st, j);

  // --- Guarda 1: supervivencia económica o alimentaria ---
  if (j.F < Cj || j.E < Gj) {
    if (ejs.length > 0) {
      const peor = ejs.reduce((a, b) =>
        a.S * (1 + a.X / 100) * (a.M / 100) <= b.S * (1 + b.X / 100) * (b.M / 100) ? a : b);
      j.E += ganancia(P.varpi * P.cR * peor.S);
      peor.vivo = false;
    }
    const rica = mias.reduce((a, b) => (b.Pob > a.Pob ? b : a));
    insertar(st.lef, st.t, PRIO.ACTIVIDAD, "INICIO_CONSTRUCCION",
             { provincia: rica.id, mejora: "mercado", jugador: j.id });
    // §4.5: ProponerTregua(j, VecinoMasFuerte(j)) — sólo tiene sentido si hay guerra en curso.
    const rival = vecinoMasFuerte(st, j);
    if (rival !== null && enGuerra(st, j.id, rival))
      insertar(st.lef, st.t, PRIO.ACTIVIDAD, "PROPUESTA_ACUERDO", { de: j.id, a: rival, tipo: "tregua" });
    return;
  }

  // --- Guarda 2: amenaza en frontera ---
  if (amenaza(st, j) > P.rhoDef) {
    const bastion = mias.reduce((a, b) =>
      (b.Pob * (1 + b.D / 100) > a.Pob * (1 + a.D / 100) ? b : a));
    const esFrontera = (u: number) =>
      st.provincias[u].vecinos.some((v) => st.provincias[v].c !== j.id);
    for (const e of ejs)
      if (!esFrontera(e.u))
        insertar(st.lef, st.t, PRIO.ACTIVIDAD, "INICIO_MOVIMIENTO",
                 { ejercito: e.id, destino: bastion.id, origen: e.u });
    if (j.E >= COSTO_CASTILLO)
      insertar(st.lef, st.t, PRIO.ACTIVIDAD, "INICIO_CONSTRUCCION",
               { provincia: bastion.id, mejora: "castillo", jugador: j.id });
    const lote = Math.floor((j.E - Gj) / P.cR);
    if (lote >= P.loteMin)
      insertar(st.lef, st.t, PRIO.ACTIVIDAD, "INICIO_ENTRENAMIENTO",
               { jugador: j.id, provincia: bastion.id, soldados: lote });
    return;
  }

  // --- Guarda 3: existe un objetivo rentable ---
  const adyacentes = new Set<number>();
  for (const p of mias) for (const v of p.vecinos)
    if (st.provincias[v].c !== j.id) adyacentes.add(v);

  const candidatas = [...adyacentes].filter((id) => {
    if (razonFuerzas(st, id, j.id) < P.rhoMin) return false;
    const dueno = st.provincias[id].c;
    return dueno === -1 || st.relaciones[j.id][dueno] <= P.rPaz;
  });

  if (candidatas.length > 0 && ejs.length > 0) {
    let mejor = candidatas[0], mejorU = -Infinity, mejorK = ejs[0].id;
    for (const id of candidatas) {
      const k = ejs.reduce((a, b) => (DIST[a.u][id] <= DIST[b.u][id] ? a : b));
      const u = utilidad(st, j, id, k.id);
      if (u > mejorU) { mejorU = u; mejor = id; mejorK = k.id; }
    }
    const dueno = st.provincias[mejor].c;
    if (dueno !== -1 && !enGuerra(st, j.id, dueno)) declararGuerra(st, j.id, dueno);
    const k = st.ejercitos.get(mejorK)!;
    insertar(st.lef, st.t, PRIO.ACTIVIDAD, "INICIO_MOVIMIENTO",
             { ejercito: mejorK, destino: mejor, origen: k.u });
    return;
  }

  // --- Guarda 4 (por defecto): desarrollo interno ---
  if (j.E >= COSTO_MEJORA) {
    const sinMercado = mias.filter((p) => !p.mejoras.includes("mercado"));
    if (sinMercado.length > 0) {
      const obj = sinMercado.reduce((a, b) => (b.Pob > a.Pob ? b : a));
      insertar(st.lef, st.t, PRIO.ACTIVIDAD, "INICIO_CONSTRUCCION",
               { provincia: obj.id, mejora: "mercado", jugador: j.id });
      return;
    }
  }
  const tec = mejorTecnologia(j);
  if (tec && !j.investigando) iniciarInvestigacion(st, j, tec);
}
