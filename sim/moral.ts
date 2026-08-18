import { clamp, perdida } from "./redondeo";
import type { Ejercito, Estado, Parametros } from "./tipos";

/**
 * ecs. 3.28 y 5.3 — tasa de deserción, función por partes de la moral.
 * Continua en M0, discontinua sólo en M = 0 donde salta a 1: un ejército sin
 * moral se disuelve entero en el mismo turno. La discontinuidad es deliberada.
 */
export function tasaDesercion(M: number, params: Parametros): number {
  if (M >= params.M0) return 0;
  if (M <= 0) return 1;
  return params.dMax * (params.M0 - M) / params.M0;
}

/**
 * ecs. 3.26 y 3.27 — variación de moral del turno.
 * NO incluye los términos de batalla: errata §5.1 del spec. `resolverBatalla`
 * ya los aplicó; incluirlos acá los contaría dos veces.
 */
export function actualizarMoral(
  st: Estado, e: Ejercito, sj: number, quiebra: number, enProvinciaPropia: boolean,
): void {
  const P = st.params;
  let dM = 0;
  if (!e.combatioEsteTurno && enProvinciaPropia) dM += P.rhoM * (100 - e.M);
  dM -= P.deltaH * sj;
  dM -= P.deltaQ * quiebra;
  e.M = clamp(e.M + dM, 0, 100);
}

/** ec. 3.29 — aplica las deserciones y elimina el ejército si queda vacío. */
export function desertar(st: Estado, e: Ejercito): void {
  const bajas = perdida(e.S * tasaDesercion(e.M, st.params));
  e.S = Math.max(0, e.S - bajas);
  if (e.S === 0) e.vivo = false;
}
