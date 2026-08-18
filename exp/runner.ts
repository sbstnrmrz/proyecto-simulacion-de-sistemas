import { correr } from "../sim/motor";
import { crearPartida, configPorDefecto } from "../sim/inicial";
import { resumirCelda } from "./metricas";
import type { Corrida, Resumen } from "./tipos";

/** Factor A del §7: número de jugadores activos iniciales. */
export const NIVELES_A = [3, 5, 8];

/** Factor B del §7: mantenimiento militar por soldado, oro/(soldado·turno). */
export const NIVELES_B = [0.05, 0.1, 0.2];

/**
 * §3.6.4 — números aleatorios comunes: el MISMO vector en las nueve celdas,
 * para que la diferencia entre configuraciones sea atribuible al factor y no
 * al azar del muestreo.
 */
export const SEMILLAS = Array.from({ length: 30 }, (_, r) => 1000 + r);

/** Una corrida del factorial. Estado fresco: no comparte nada con las demás. */
export function unaCorrida(nJugadores: number, gamma: number, semilla: number): Corrida {
  const cfg = configPorDefecto({ semilla, nJugadores });
  cfg.params.gamma = gamma;                     // Factor B

  const st = crearPartida(cfg);
  const r = correr(st);

  return {
    nJugadores, gamma, semilla,
    tVic: r.tVic,
    ganador: r.ganador,
    motivo: r.motivo,
    colapsados: r.colapsos.filter((c) => c.colapso).length,     // ec. 3.36
    llegaronA40: r.colapsos.filter((c) => c.llegoA40).length,   // denominador de la 3.37
  };
}

/**
 * Factorial completo 3 × 3 × 30 = 270 corridas.
 * @param alProgresar se invoca al terminar cada celda, con (hechas, total).
 */
export function correrLote(
  alProgresar?: (hechas: number, total: number) => void,
): Resumen {
  const total = NIVELES_A.length * NIVELES_B.length * SEMILLAS.length;
  const corridas: Corrida[] = [];
  const celdas = [];

  for (const nJugadores of NIVELES_A) {
    for (const gamma of NIVELES_B) {
      const deLaCelda = SEMILLAS.map((s) => unaCorrida(nJugadores, gamma, s));
      corridas.push(...deLaCelda);
      celdas.push(resumirCelda(deLaCelda));
      alProgresar?.(corridas.length, total);
    }
  }

  return { celdas, corridas };
}

/**
 * Igual que `correrLote`, pero cede el control al event loop entre celdas
 * para que la interfaz pueda pintar el progreso (§7). Nueve pausas en total.
 */
export async function correrLoteProgresivo(
  alProgresar?: (hechas: number, total: number) => void,
): Promise<Resumen> {
  const total = NIVELES_A.length * NIVELES_B.length * SEMILLAS.length;
  const corridas: Corrida[] = [];
  const celdas = [];

  for (const nJugadores of NIVELES_A) {
    for (const gamma of NIVELES_B) {
      const deLaCelda = SEMILLAS.map((s) => unaCorrida(nJugadores, gamma, s));
      corridas.push(...deLaCelda);
      celdas.push(resumirCelda(deLaCelda));
      alProgresar?.(corridas.length, total);
      // setTimeout(0), no rAF: cede de verdad al event loop para que el
      // navegador pueda pintar el progreso antes de seguir con la próxima celda.
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  return { celdas, corridas };
}
