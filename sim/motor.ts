import { extraerMin, insertar, vacia, P as PRIO, type Evento } from "./lef";
import { bernoulli, empirica, uniformeDiscreta } from "./rng";
import { MEJORAS } from "./datos/mejoras";
import { crecer } from "./poblacion";
import {
  balanceAlimentario, gasto, ingreso, verificarQuiebra,
} from "./economia";
import { resolverBatalla } from "./combate";
import { actualizarMoral, desertar } from "./moral";
import {
  actualizarLealtad, actualizarRelaciones, ajustarRelacion, enGuerra,
  transicionEstado,
} from "./diplomacia";
import { intentarCompletar } from "./tecnologia";
import { decidirIA } from "./ia";
import { evaluarVictoria } from "./puntuacion";
import { distancias, MAPA25 } from "./datos/mapa";
import { ganancia, perdida } from "./redondeo";
import type { Estado, Jugador, MejoraId, Resultado } from "./tipos";

// Seguro a nivel de módulo: hay un solo mapa (MAPA25) y su adyacencia es
// INMUTABLE, a diferencia de a_i^E (Provincia.aE), que sí muta por partida
// (ec. 3.7/§5.4) y por eso `crearPartida` clona las provincias en `inicial.ts`.
const DIST = distancias(MAPA25);

/** Invalidación perezosa del §5.3: descarta eventos de entidades muertas. */
function entidadesVivas(st: Estado, e: Evento): boolean {
  const d = e.datos ?? {};
  if (typeof d.ejercito === "number") {
    const k = st.ejercitos.get(d.ejercito);
    if (!k || !k.vivo || k.S === 0) return false;
  }
  if (typeof d.atacante === "number") {
    const k = st.ejercitos.get(d.atacante);
    if (!k || !k.vivo || k.S === 0) return false;
  }
  if (typeof d.jugador === "number" && !st.jugadores[d.jugador]?.activo) return false;
  return true;
}

export function pasoEvento(st: Estado): Evento | null {
  const e = extraerMin(st.lef);
  if (!e) return null;

  // §5.3 — bloqueo del avance de tiempo: nada puede encolarse hacia atrás.
  if (e.t < st.t) throw new Error(`evento en el pasado: ${e.t} < ${st.t}`);
  st.t = e.t;

  if (!entidadesVivas(st, e)) return e;
  despachar(st, e);
  return e;
}

function despachar(st: Estado, e: Evento): void {
  const d = e.datos ?? {};
  switch (e.tipo) {
    case "INICIO_TURNO":      return inicioTurno(st);
    case "EVENTO_ALEATORIO":  return eventoGlobal(st);
    case "DECISION_JUGADOR":  return decidirIA(st, st.jugadores[d.jugador]);
    case "INICIO_MOVIMIENTO": return iniciarMovimiento(st, d);
    case "LLEGADA_DESTINO":   return llegadaDestino(st, d);
    case "BATALLA":           return batalla(st, d);
    case "CONQUISTA_PROVINCIA": return conquistar(st, d);
    case "INICIO_CONSTRUCCION": return iniciarConstruccion(st, d);
    case "MEJORA_COMPLETADA": return completarMejora(st, d);
    case "INICIO_ENTRENAMIENTO": return iniciarEntrenamiento(st, d);
    case "TROPAS_LISTAS":     return incorporarTropas(st, d);
    case "PROPUESTA_ACUERDO": return proponerAcuerdo(st, d);
    case "ACUERDO_RATIFICADO": return ratificarAcuerdo(st, d);
    case "FIN_TURNO":         return finTurno(st);
    default:                  return;
  }
}

/** §4.2 — programa los eventos ordinarios del turno. */
function inicioTurno(st: Estado): void {
  if (bernoulli(st.rng, st.params.pE))
    insertar(st.lef, st.t, PRIO.EVENTO_ALEATORIO, "EVENTO_ALEATORIO", {});
  for (const j of st.jugadores)
    if (j.activo)
      insertar(st.lef, st.t, PRIO.DECISION_JUGADOR, "DECISION_JUGADOR", { jugador: j.id });
  insertar(st.lef, st.t, PRIO.FIN_TURNO, "FIN_TURNO", {});
}

/** §3.6.3 — distribución empírica de los cuatro eventos globales. */
const ACUM = [0.3, 0.55, 0.8, 1.0];

function eventoGlobal(st: Estado): void {
  const v = empirica(st.rng, ACUM);
  const p = st.provincias[uniformeDiscreta(st.rng, st.provincias.length)];

  if (v === 0) {                                     // peste
    p.Pob = Math.max(0, p.Pob - perdida(p.Pob * 0.2));
  } else if (v === 1) {                              // hambruna
    for (const j of st.jugadores) if (j.activo) j.F = ganancia(0.5 * j.F);
  } else if (v === 2) {                              // descubrimiento de oro
    p.aE *= 1.3;                                     // permanente — §5.4 del spec
  } else {                                           // invasión bárbara
    // §3.6.3 — el objetivo se sortea entre los activos. El sorteo es
    // INCONDICIONAL y ocupa un punto fijo del flujo: consume exactamente un
    // número del generador cada vez que sale «invasión», pase lo que pase
    // después (§3.6.4).
    const activos = st.jugadores.filter((j) => j.activo);
    const objetivo = activos[uniformeDiscreta(st.rng, activos.length)];
    if (!objetivo) return;
    let S = 0;
    for (const e of st.ejercitos.values())
      if (e.vivo && e.jugador === objetivo.id) S += e.S;
    const id = st.proximoEjercitoId++;
    st.ejercitos.set(id, {
      id, jugador: -1, S: perdida(0.1 * S), M: 70, X: 0, u: p.id,
      combatioEsteTurno: false, vivo: true,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function iniciarMovimiento(st: Estado, d: any): void {
  const k = st.ejercitos.get(d.ejercito)!;
  const turnos = Math.max(1, DIST[k.u][d.destino]);
  insertar(st.lef, st.t + turnos, PRIO.LLEGADA_DESTINO, "LLEGADA_DESTINO",
           { ejercito: d.ejercito, destino: d.destino, origen: k.u });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function llegadaDestino(st: Estado, d: any): void {
  const k = st.ejercitos.get(d.ejercito)!;
  const hayEnemigo = [...st.ejercitos.values()].some(
    (e) => e.vivo && e.S > 0 && e.u === d.destino && e.jugador !== k.jugador);
  if (hayEnemigo)
    insertar(st.lef, st.t, PRIO.BATALLA, "BATALLA",
             { atacante: d.ejercito, provincia: d.destino, origen: d.origen });
  else {
    k.u = d.destino;
    if (st.provincias[d.destino].c !== k.jugador)
      insertar(st.lef, st.t, PRIO.CONQUISTA, "CONQUISTA_PROVINCIA",
               { atacante: d.ejercito, provincia: d.destino, jugador: k.jugador });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function batalla(st: Estado, d: any): void {
  const r = resolverBatalla(st, d.atacante, d.provincia, d.origen);
  if (!r.ataqueExitoso) return;
  const k = st.ejercitos.get(d.atacante);
  if (k && k.vivo) k.u = d.provincia;
  insertar(st.lef, st.t, PRIO.CONQUISTA, "CONQUISTA_PROVINCIA",
           { atacante: d.atacante, provincia: d.provincia, jugador: k?.jugador });
}

/** ec. 3.23 — la provincia entra con lealtad baja y propensa a rebelarse. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function conquistar(st: Estado, d: any): void {
  const k = st.ejercitos.get(d.atacante);
  if (!k || !k.vivo) return;
  const p = st.provincias[d.provincia];
  const anterior = p.c;
  p.c = k.jugador;
  p.lealtad = st.params.lambdaConq;
  p.estado = "normal";
  if (anterior >= 0 && k.jugador >= 0) ajustarRelacion(st, k.jugador, anterior, -25);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function iniciarConstruccion(st: Estado, d: any): void {
  const j = st.jugadores[d.jugador];
  const p = st.provincias[d.provincia];
  const m = MEJORAS[d.mejora as MejoraId];
  if (!j?.activo || p.c !== j.id || p.mejoras.includes(d.mejora)) return;
  if (j.E < m.costo) return;
  j.E -= m.costo;                                    // cargo discreto de Ξ_j(t)
  insertar(st.lef, st.t + m.turnos, PRIO.COMPLETADO, "MEJORA_COMPLETADA",
           { provincia: d.provincia, mejora: d.mejora, jugador: d.jugador });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function completarMejora(st: Estado, d: any): void {
  const p = st.provincias[d.provincia];
  if (p.c !== d.jugador || p.mejoras.includes(d.mejora)) return;
  p.mejoras.push(d.mejora);
  p.D += MEJORAS[d.mejora as MejoraId].dD;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function iniciarEntrenamiento(st: Estado, d: any): void {
  const j = st.jugadores[d.jugador];
  const costo = d.soldados * st.params.cR;
  if (!j?.activo || j.E < costo) return;
  j.E -= costo;                                      // cargo discreto de Ξ_j(t)
  insertar(st.lef, st.t + st.params.turnosEntrenamiento, PRIO.COMPLETADO,
           "TROPAS_LISTAS", d);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function incorporarTropas(st: Estado, d: any): void {
  const j = st.jugadores[d.jugador];
  if (!j?.activo) return;
  const existente = [...st.ejercitos.values()].find(
    (e) => e.vivo && e.jugador === j.id && e.u === d.provincia);
  if (existente) { existente.S += d.soldados; return; }
  const id = st.proximoEjercitoId++;
  st.ejercitos.set(id, {
    id, jugador: j.id, S: d.soldados, M: st.params.moralRecluta, X: 0,
    u: d.provincia, combatioEsteTurno: false, vivo: true,
  });
}

/**
 * §3.6.2 y §3.8 — una propuesta abre una negociación de duración aleatoria
 * Uniforme discreta {1..kmax} y encola su ratificación.
 * El sorteo se consume SIEMPRE que la propuesta se despacha, en este punto
 * exacto, para no desincronizar el flujo del generador (§5.3).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function proponerAcuerdo(st: Estado, d: any): void {
  const duracion = 1 + uniformeDiscreta(st.rng, st.params.kmaxNegociacion);
  insertar(st.lef, st.t + duracion, PRIO.COMPLETADO, "ACUERDO_RATIFICADO",
           { de: d.de, a: d.a, tipo: d.tipo });
}

/**
 * §3.8 y ec. 3.30 — tregua ratificada: R ← 0, lo único que libera el
 * congelamiento de R en −100 durante la guerra. Si alguno de los dos ya no
 * está activo, o ya dejaron de estar en guerra, el evento se descarta.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ratificarAcuerdo(st: Estado, d: any): void {
  const a = st.jugadores[d.de], b = st.jugadores[d.a];
  if (!a?.activo || !b?.activo) return;
  if (!enGuerra(st, a.id, b.id)) return;
  st.relaciones[a.id][b.id] = 0;
  st.relaciones[b.id][a.id] = 0;
  st.acuerdos.push({
    tipo: "tregua", entre: [a.id, b.id], delta: st.params.duracionTregua,
  });
}

/**
 * §5.1 — eliminación de un jugador. No alcanza con `activo = false`: el bucle
 * de FinTurno saltea a los inactivos, así que sus ejércitos serían inmortales
 * (ni moral ni deserción), sus acuerdos seguirían vigentes y su fila/columna de
 * R seguiría arrastrando guerras congeladas. El §5.1 exige retirar las tres
 * cosas. Las conquistas que dejó encoladas las descarta `entidadesVivas`
 * gracias al campo `jugador` que llevan los CONQUISTA_PROVINCIA.
 */
function eliminarJugador(st: Estado, j: Jugador): void {
  j.activo = false;
  for (const e of st.ejercitos.values()) if (e.jugador === j.id) e.vivo = false;
  st.acuerdos = st.acuerdos.filter((a) => !a.entre.includes(j.id));
  for (let l = 0; l < st.relaciones.length; l++) {
    st.relaciones[j.id][l] = 0;
    st.relaciones[l][j.id] = 0;
  }
}

/** §4.3 — los pasos 1 a 8 corren por jugador; el 9 (puntuación) y el 10, una sola vez. */
function finTurno(st: Estado): void {
  for (const j of st.jugadores) {
    if (!j.activo) continue;
    const mias = st.provincias.filter((p) => p.c === j.id);

    // 1. Crecimiento poblacional. s_j todavía es el del turno anterior: la
    //    hambruna de este turno se aplica en el paso 4 (retardo deseado, §4.3).
    for (const p of mias) crecer(p, st.params);

    // 2-3. Recaudación y gastos.
    const I = ingreso(st, j);
    const G = gasto(st, j);
    const Q = st.params.iota * I;                    // ec. 3.9

    // 4. Balance alimentario y hambruna.
    const sj = balanceAlimentario(st, j);
    if (sj > 0)
      for (const p of mias)
        p.Pob = Math.max(0, p.Pob - perdida(p.Pob * st.params.phi * sj));

    // 5. Balance económico, I+D y quiebra.
    // ec. 3.10. §5.3: E es entera y se redondea en CADA actualización. Sin
    // esto un residuo de coma flotante de −1e−13 dispara `verificarQuiebra`.
    j.E = ganancia(j.E + I - G - Q);
    j.RD += st.params.psi * Q;                       // ec. 3.11
    intentarCompletar(st, j);                        // ec. 3.12
    const quiebra = verificarQuiebra(st, j);

    // 6-7. Moral y deserciones.
    for (const e of st.ejercitos.values()) {
      if (!e.vivo || e.jugador !== j.id) continue;
      actualizarMoral(st, e, sj, quiebra, st.provincias[e.u].c === j.id);
      desertar(st, e);
    }

    // 8. Diplomacia y lealtad. `actualizarRelaciones` NO va acá: R es simétrica
    //    y se actualiza por PAR, una sola vez por turno (ver más abajo).
    for (const p of mias) {
      actualizarLealtad(st, p, sj);
      transicionEstado(st, p);
      if (p.Pob === 0) {
        p.turnosDespoblada++;
        if (p.turnosDespoblada >= st.params.chi) { p.c = -1; p.turnosDespoblada = 0; }
      } else p.turnosDespoblada = 0;
    }
  }

  // 8 bis. ec. 3.30 sobre PARES no ordenados, una vez por turno. Dentro del
  // bucle por jugador cada par se procesaba una vez por jugador activo y la
  // constante de tiempo de la deriva quedaba dividida por n.
  for (const j of st.jugadores)
    if (j.activo) actualizarRelaciones(st, j, (otro) => otro > j.id);

  // δ_a decrece una vez por TURNO, no una vez por jugador.
  for (const a of st.acuerdos) a.delta = Math.max(0, a.delta - 1);

  // Limpieza y series.
  for (const [id, e] of st.ejercitos) if (!e.vivo) st.ejercitos.delete(id);
  for (const e of st.ejercitos.values()) e.combatioEsteTurno = false;

  const N = st.provincias.length;
  for (const j of st.jugadores) {
    const n = st.provincias.filter((p) => p.c === j.id).length;
    if (j.activo && n === 0) eliminarJugador(st, j);  // §5.1 — jugador eliminado
    st.series.nFrac[j.id].push(n / N);
    st.series.E[j.id].push(j.E);
  }

  // 9-10. Puntuación y condiciones de victoria — una sola vez, fuera del bucle
  // por jugador: `evaluarVictoria` es la única función que calcula V (ec.
  // 3.33), sobre el estado YA limpio (ejércitos muertos purgados, jugadores
  // eliminados marcados). Si se calculara dentro del bucle de arriba, los
  // jugadores de id mayor todavía no habrían crecido/recaudado ese turno y la
  // serie quedaría sesgada respecto del V final.
  evaluarVictoria(st);
  for (const j of st.jugadores) st.series.V[j.id].push(j.V);
  if (!st.fin) insertar(st.lef, st.t + 1, PRIO.INICIO_TURNO, "INICIO_TURNO", {});
}

export function pasoTurno(st: Estado): void {
  const objetivo = st.t;
  for (;;) {
    const e = pasoEvento(st);
    if (!e || st.fin) return;
    if (e.tipo === "FIN_TURNO" && e.t >= objetivo) return;
  }
}

/** ecs. 3.36-3.37 — diagnóstico de colapso sobre la trayectoria territorial. */
export function resultadoDe(st: Estado): Resultado {
  const colapsos = st.jugadores.map((j) => {
    const serie = st.series.nFrac[j.id];
    let llegoA40 = false, colapso = false;
    for (const x of serie) {
      if (x >= 0.4) llegoA40 = true;
      else if (llegoA40 && x < 0.2) colapso = true;
    }
    return { jugador: j.id, llegoA40, colapso };
  });
  return {
    tVic: st.fin?.t ?? st.t,
    ganador: st.fin?.ganador ?? -1,
    motivo: st.fin?.motivo ?? "horizonte",
    colapsos,
  };
}

export function correr(st: Estado): Resultado {
  while (!st.fin && !vacia(st.lef) && st.t <= st.params.tMax) pasoEvento(st);
  if (!st.fin) { st.t = Math.min(st.t, st.params.tMax); evaluarVictoria(st); }
  return resultadoDe(st);
}
