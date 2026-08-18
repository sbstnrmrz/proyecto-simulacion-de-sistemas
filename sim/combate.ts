import { clamp, perdida } from "./redondeo";
import { uniforme } from "./rng";
import type { Ejercito, Estado } from "./tipos";

/**
 * ecs. 3.14 y 3.15 — factor de calidad adimensional.
 * El atacante pasa defensaProv = 0; el defensor, el D_i de su provincia.
 */
export function factorCalidad(e: Ejercito, beta: number, defensaProv: number): number {
  return (1 + e.X / 100) * (e.M / 100) * (1 + beta) * (1 + defensaProv / 100);
}

/** ec. 3.16 — fuerza efectiva Φ_k = S_k · q_k. */
export const fuerzaEfectiva = (e: Ejercito, q: number): number => e.S * q;

/**
 * ec. 3.18 — invariante de Lanchester. Positiva ⟺ el atacante aniquila.
 * La usa la IA (§4.5) y la validación del §7.
 */
export const invariante = (qA: number, A0: number, qD: number, D0: number): number =>
  qA * A0 ** 2 - qD * D0 ** 2;

export type ResultadoBatalla = {
  ataqueExitoso: boolean; rondas: number; A: number; D: number;
};

/**
 * §3.5.3 y §3.5.4 — resuelve una batalla completa y aplica experiencia y moral.
 * NO aplica la conquista: eso lo encola el motor como CONQUISTA_PROVINCIA (p=6).
 */
export function resolverBatalla(
  st: Estado, atacanteId: number, provinciaId: number, origen: number,
): ResultadoBatalla {
  const P = st.params;
  const k = st.ejercitos.get(atacanteId)!;
  const prov = st.provincias[provinciaId];

  const defensor = [...st.ejercitos.values()].find(
    (e) => e.vivo && e.u === provinciaId && e.jugador !== k.jugador && e.S > 0);

  // Primera guarda del §4.4: provincia sin guarnición → conquista directa.
  if (!defensor) return { ataqueExitoso: true, rondas: 0, A: k.S, D: 0 };

  const jugA = st.jugadores[k.jugador];
  const jugD = defensor.jugador >= 0 ? st.jugadores[defensor.jugador] : null;
  const qA = factorCalidad(k, jugA?.betaAtk ?? 0, 0);
  const qD = factorCalidad(defensor, jugD?.betaDef ?? 0, prov.D);

  let A = k.S, D = defensor.S;
  const A0 = A, D0 = D;

  // §5.3: si algún bando arranca en 0, la batalla se descarta (evita /0 en 3.21).
  if (A0 === 0 || D0 === 0) return { ataqueExitoso: false, rondas: 0, A, D };

  let n = 0;
  while (n < P.NR && A > 0 && D > 0 && A >= P.epsRet * A0 && D >= P.epsRet * D0) {
    const epsA = uniforme(st.rng, P.epsMin, P.epsMax);
    const epsD = uniforme(st.rng, P.epsMin, P.epsMax);
    const bajasD = perdida(P.lambda * qA * A * epsA);   // ec. 3.19
    const bajasA = perdida(P.lambda * qD * D * epsD);
    A = Math.max(0, A - bajasA);                        // ec. 3.20, simultáneo
    D = Math.max(0, D - bajasD);
    n++;
  }

  k.S = A; defensor.S = D;
  k.combatioEsteTurno = true;
  defensor.combatioEsteTurno = true;

  // Adjudicación §3.5.3: el empate favorece al defensor.
  const ataqueExitoso = (D === 0 || D < P.epsRet * D0) && A >= P.epsRet * A0;

  // ec. 3.21 — experiencia proporcional al daño infligido.
  k.X = Math.min(100, k.X + P.xi * ((D0 - D) / D0));
  defensor.X = Math.min(100, defensor.X + P.xi * ((A0 - A) / A0));

  // ec. 3.22 — moral. ω_V y ω_D son magnitudes positivas (errata §5.2 del spec):
  // el vencedor suma ω_V, el perdedor resta ω_D, y ambos pagan δ_B por sus bajas.
  const costoA = P.deltaB * ((A0 - A) / A0);
  const costoD = P.deltaB * ((D0 - D) / D0);
  if (ataqueExitoso) {
    k.M = clamp(k.M + P.omegaV - costoA, 0, 100);
    defensor.M = clamp(defensor.M - P.omegaD - costoD, 0, 100);
  } else {
    k.M = clamp(k.M - P.omegaD - costoA, 0, 100);
    defensor.M = clamp(defensor.M + P.omegaV - costoD, 0, 100);
  }

  if (k.S === 0) k.vivo = false;
  if (defensor.S === 0) defensor.vivo = false;
  // Repliegue (§4.4, pseudocódigo Replegar(k, origen)) — instantáneo, ignora
  // el tiempo de viaje (el modelo lo tolera). Se valida el destino: la LEF
  // puede resolver varias BATALLA con la misma marca temporal, así que
  // `origen` puede haber caído en manos enemigas en este mismo turno; si ya
  // no es del atacante, el ejército derrotado se queda donde está en vez de
  // aterrizar sin aviso dentro de territorio enemigo.
  if (!ataqueExitoso && k.S > 0 && st.provincias[origen].c === k.jugador) k.u = origen;

  return { ataqueExitoso, rondas: n, A, D };
}
