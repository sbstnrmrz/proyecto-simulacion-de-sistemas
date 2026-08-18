import type { Motivo } from "../sim/tipos";

/** Una corrida del factorial: la unidad experimental. */
export type Corrida = {
  nJugadores: number;      // Factor A
  gamma: number;           // Factor B
  semilla: number;
  tVic: number;            // turnos hasta el fin — ec. 3.34
  ganador: number;         // −1 si nadie
  motivo: Motivo;          // 'horizonte' se contabiliza aparte, §5.3
  colapsados: number;      // jugadores que colapsaron — ec. 3.36
  llegaronA40: number;     // jugadores que cruzaron el 40 % — denominador de la ec. 3.37
};

/** Resumen de una celda del factorial (una combinación de factores). */
export type Celda = {
  nJugadores: number;
  gamma: number;
  n: number;               // réplicas, 30
  mediaTVic: number;       // T̄_vic — ec. 3.34
  varianzaTVic: number;    // s² — ec. 3.34
  ic95: [number, number];  // ec. 3.35
  fraccionHorizonte: number;   // §5.3 — señal de censura
  colapsados: number;      // suma sobre réplicas
  llegaronA40: number;     // suma sobre réplicas
  tasaColapso: number | null;  // ec. 3.37; null si el denominador es 0
};

export type Resumen = { celdas: Celda[]; corridas: Corrida[] };
