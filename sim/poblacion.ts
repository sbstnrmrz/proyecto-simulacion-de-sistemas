import { clamp, ganancia } from "./redondeo";
import type { EstadoProv, Parametros, Provincia } from "./tipos";

/** Factor poblacional de la ec. 3.1: 1 normal, 0 asediada, 0,5 rebelde. */
export function etaPob(estado: EstadoProv): number {
  if (estado === "normal") return 1;
  if (estado === "asediada") return 0;
  return 0.5;
}

/**
 * ecs. 3.1 y 3.2 — crecimiento logístico.
 * El término de pérdidas φ·s_j + π_evento de la ec. 3.2 NO vive acá: la
 * pérdida por hambruna la aplica `finTurno` en su paso 4 (§4.3, con el s_j
 * de ESTE turno, calculado después del crecimiento por el retardo del
 * modelo), y la pérdida por peste la aplica `eventoGlobal` directamente
 * sobre p.Pob. Meterlas acá con sj=0/piEvento=0 fijos en el único
 * llamador de producción las volvía código muerto.
 */
export function crecer(p: Provincia, params: Parametros): void {
  const crecimiento = params.r * p.Pob * (1 - p.Pob / p.K) * etaPob(p.estado);
  p.Pob = clamp(ganancia(p.Pob + crecimiento), 0, p.K);   // ec. 3.1
}
