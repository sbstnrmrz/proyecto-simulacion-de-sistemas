import type { LEF } from "./lef";
import type { Rng } from "./rng";

export type MapaId = "reticula25";
export type TecId =
  | "arado" | "rutas" | "herreria" | "asedio" | "muralla_seca" | "fortificacion";
export type MejoraId = "granja" | "mercado" | "muralla" | "castillo";
export type EstadoProv = "normal" | "asediada" | "rebelde";
export type Motivo = "dominacion" | "puntuacion" | "horizonte";

export type Parametros = {
  // §2.4 — económicos y alimentarios
  tau: number; alpha: number; sigma: number; gamma: number; kappa: number;
  iota: number; psi: number; r: number; phi: number;
  // §2.4 — combate
  lambda: number; NR: number; epsRet: number; epsMin: number; epsMax: number;
  deltaB: number; deltaH: number; deltaQ: number;
  omegaV: number; omegaD: number;   // magnitudes positivas — errata §5.2
  rhoM: number; M0: number; dMax: number; xi: number;
  cR: number; varpi: number;
  // §2.4 — IA y diplomacia
  rhoMin: number; rhoDef: number;
  nu: number; zeta: number; rGuerra: number; rPaz: number;
  pE: number; thetaV: number; tMax: number;
  wP: number; wH: number; wS: number; wT: number;
  // §3.8 — lealtad
  rhoLambda: number; lambdaEq: number; zetaG: number; zetaH: number;
  zetaM: number; lambdaConq: number; lambdaCrit: number; lambdaRec: number;
  // §5.1
  chi: number;                      // turnos despoblada antes de volver a neutral
  // ec. 4.4 — utilidad de la IA
  w1: number; w2: number; w3: number; w4: number;
  // §4.4 del spec — reclutamiento (no está en el modelo)
  loteMin: number; turnosEntrenamiento: number; moralRecluta: number;
  kmaxNegociacion: number; duracionTregua: number;
};

export type Jugador = {
  id: number; activo: boolean;
  E: number; F: number; RD: number;
  tecnologias: Set<TecId>;
  investigando: { tec: TecId; t0: number } | null;
  betaEco: number; betaAtk: number; betaDef: number;   // ec. 3.13
  V: number;                                           // ec. 3.33
};

export type Provincia = {
  id: number; nombre: string; vecinos: number[];
  K: number; a: number; D: number;
  aE: number;                    // multiplicador de riqueza, ec. 3.7 — MUTABLE (§5.4 del spec)
  Pob: number; c: number; lealtad: number;
  estado: EstadoProv;
  mejoras: MejoraId[];
  turnosDespoblada: number;
};

export type Ejercito = {
  id: number; jugador: number;   // jugador = −1 → bárbaros (§3.6.3)
  S: number; M: number; X: number; u: number;
  combatioEsteTurno: boolean;
  vivo: boolean;                 // invalidación perezosa, §5.3
};

export type Acuerdo = {
  tipo: "tregua" | "paz" | "alianza";
  entre: [number, number];
  delta: number;                 // δ_a — turnos restantes, §2.1
};

export type Series = { nFrac: number[][]; E: number[][]; V: number[][] };

export type Config = {
  semilla: number;
  nJugadores: number;
  mapa: MapaId;
  params: Parametros;
};

export type Estado = {
  t: number;
  rng: Rng;
  lef: LEF;
  jugadores: Jugador[];
  provincias: Provincia[];
  ejercitos: Map<number, Ejercito>;
  proximoEjercitoId: number;
  relaciones: number[][];
  acuerdos: Acuerdo[];
  params: Parametros;
  series: Series;
  fin: { t: number; ganador: number; motivo: Motivo } | null;
};

export type Resultado = {
  tVic: number;
  ganador: number;
  motivo: Motivo;
  colapsos: { jugador: number; llegoA40: boolean; colapso: boolean }[];
};
