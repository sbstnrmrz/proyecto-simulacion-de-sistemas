import { clamp, perdida, ganancia } from "./redondeo";
import type { EstadoProv, Parametros, Provincia } from "./tipos";

/** Factor poblacional de la ec. 3.1: 1 normal, 0 asediada, 0,5 rebelde. */
export function etaPob(estado: EstadoProv): number {
  if (estado === "normal") return 1;
  if (estado === "asediada") return 0;
  return 0.5;
}

/**
 * ecs. 3.1 y 3.2 — crecimiento logístico menos pérdidas del turno.
 * @param sj índice de escasez alimentaria del propietario (ec. 3.6)
 * @param piEvento fracción destruida por un evento global activo (ej. 0,20 peste)
 */
export function crecer(
  p: Provincia, params: Parametros, sj: number, piEvento: number,
): void {
  const crecimiento = params.r * p.Pob * (1 - p.Pob / p.K) * etaPob(p.estado);
  const perdidas = perdida(p.Pob * (params.phi * sj + piEvento));   // ec. 3.2
  p.Pob = clamp(ganancia(p.Pob + crecimiento - perdidas), 0, p.K);  // ec. 3.1
}
