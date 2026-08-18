import type { TecId } from "../tipos";

export type TecDato = {
  nombre: string;
  eEco: number; eAtk: number; eDef: number;   // ec. 3.13
  C: number;                                   // C_θ, costo en puntos I+D
  D: number;                                   // D_θ, turnos mínimos
  prereq: TecId[];
};

/**
 * §4.2 del spec — inventado, no está en el modelo. Costos calibrados contra
 * Q_j ≈ 60 puntos I+D/turno de un jugador de 3 provincias interiores:
 * tier 1 ≈ 5 turnos, tier 2 ≈ 15.
 */
export const TECNOLOGIAS: Record<TecId, TecDato> = {
  arado:         { nombre: "Arado pesado",      eEco: 0.15, eAtk: 0, eDef: 0, C: 300, D: 5, prereq: [] },
  rutas:         { nombre: "Rutas comerciales", eEco: 0.25, eAtk: 0, eDef: 0, C: 900, D: 10, prereq: ["arado"] },
  herreria:      { nombre: "Herrería",          eEco: 0, eAtk: 0.15, eDef: 0, C: 300, D: 5, prereq: [] },
  asedio:        { nombre: "Táctica de asedio", eEco: 0, eAtk: 0.25, eDef: 0, C: 900, D: 10, prereq: ["herreria"] },
  muralla_seca:  { nombre: "Muralla seca",      eEco: 0, eAtk: 0, eDef: 0.15, C: 300, D: 5, prereq: [] },
  fortificacion: { nombre: "Fortificación",     eEco: 0, eAtk: 0, eDef: 0.25, C: 900, D: 10, prereq: ["muralla_seca"] },
};
