import type { MejoraId } from "../tipos";

export type MejoraDato = {
  nombre: string;
  bE: number;      // bonificación a oro, ec. 3.7
  bF: number;      // bonificación a comida, ec. 3.3
  dD: number;      // puntos porcentuales sumados a D_i
  mu: number;      // μ_m, mantenimiento oro/turno — §2.4 exige [2, 8]
  costo: number;
  turnos: number;
};

/** §4.3 del spec — inventado, no está en el modelo. */
export const MEJORAS: Record<MejoraId, MejoraDato> = {
  granja:   { nombre: "Granja",   bE: 0,    bF: 0.25, dD: 0,  mu: 2, costo: 120, turnos: 3 },
  mercado:  { nombre: "Mercado",  bE: 0.25, bF: 0,    dD: 0,  mu: 3, costo: 150, turnos: 3 },
  muralla:  { nombre: "Muralla",  bE: 0,    bF: 0,    dD: 15, mu: 4, costo: 200, turnos: 4 },
  castillo: { nombre: "Castillo", bE: 0,    bF: 0,    dD: 30, mu: 8, costo: 400, turnos: 6 },
};

/** Constantes que `DecidirIA` (§4.5 del modelo) invocaba sin declarar. */
export const COSTO_MEJORA = MEJORAS.mercado.costo;
export const COSTO_CASTILLO = MEJORAS.castillo.costo;
