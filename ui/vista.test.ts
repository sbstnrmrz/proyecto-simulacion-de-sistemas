import { describe, it, expect } from "vitest";
import {
  filasJugadores, filasProvincias, filasEjercitos,
  matrizRelaciones, describirEvento, NOMBRE_PRIORIDAD,
} from "./vista";
import { crearPartida, configPorDefecto } from "../sim/inicial";
import { pasoTurno } from "../sim/motor";

describe("adaptadores de lectura", () => {
  it("una fila por jugador, con los agregados que el §2.1 define", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 5 }));
    const filas = filasJugadores(st);
    expect(filas).toHaveLength(5);
    // Cada jugador arranca con una provincia y un ejército de 500.
    expect(filas[0].provincias).toBe(1);
    expect(filas[0].efectivos).toBe(500);
    expect(filas[0].poblacion).toBeGreaterThan(0);
  });

  it("marca al jugador eliminado", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.jugadores[1].activo = false;
    expect(filasJugadores(st)[1].activo).toBe(false);
  });

  it("una fila por provincia, con el dueño legible", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const filas = filasProvincias(st);
    expect(filas).toHaveLength(25);
    const neutral = filas.find((f) => f.duenoTexto === "neutral");
    expect(neutral).toBeDefined();
    const propia = filas.find((f) => f.dueno === 0);
    expect(propia!.duenoTexto).toBe("0");
  });

  it("lista solo los ejércitos vivos", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const antes = filasEjercitos(st).length;
    [...st.ejercitos.values()][0].vivo = false;
    expect(filasEjercitos(st)).toHaveLength(antes - 1);
  });

  it("la matriz de relaciones marca las celdas en guerra", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.relaciones[0][1] = st.relaciones[1][0] = st.params.rGuerra;
    const m = matrizRelaciones(st);
    expect(m[0][1].enGuerra).toBe(true);
    expect(m[1][0].enGuerra).toBe(true);
    expect(m[0][2].enGuerra).toBe(false);
    expect(m[0][0].esDiagonal).toBe(true);
  });

  it("describe un evento con su clave (t, p, sec) completa — §4.1", () => {
    const e = { t: 7, p: 5, sec: 312, tipo: "BATALLA" as const, datos: {} };
    const d = describirEvento(e);
    expect(d.clave).toBe("(7, 5, 312)");
    expect(d.tipo).toBe("BATALLA");
    expect(d.prioridad).toBe("BATALLA");   // nombre de la clase de prioridad
  });

  it("nombra las nueve clases de prioridad del §4.1", () => {
    for (let p = 0; p <= 8; p++) expect(NOMBRE_PRIORIDAD[p]).toBeTruthy();
    expect(NOMBRE_PRIORIDAD[3]).toMatch(/actividad/i);
  });

  it("los agregados siguen al estado después de varios turnos", () => {
    const st = crearPartida(configPorDefecto({ semilla: 3, nJugadores: 3 }));
    for (let i = 0; i < 10; i++) pasoTurno(st);
    const filas = filasJugadores(st);
    const provinciasEnTablas = filas.reduce((s, f) => s + f.provincias, 0);
    const provinciasEnEstado = st.provincias.filter((p) => p.c >= 0).length;
    expect(provinciasEnTablas).toBe(provinciasEnEstado);
  });
});
