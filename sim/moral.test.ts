import { describe, it, expect } from "vitest";
import { tasaDesercion, actualizarMoral, desertar } from "./moral";
import { PARAMS } from "./datos/parametros";
import { crearPartida, configPorDefecto } from "./inicial";
import type { Ejercito } from "./tipos";

const ej = (over: Partial<Ejercito> = {}): Ejercito => ({
  id: 0, jugador: 0, S: 1000, M: 80, X: 0, u: 0,
  combatioEsteTurno: false, vivo: true, ...over,
});

describe("deserción (ecs. 3.28 y 5.3)", () => {
  it("no hay deserción por encima de M0 = 60", () => {
    expect(tasaDesercion(60, PARAMS)).toBe(0);
    expect(tasaDesercion(100, PARAMS)).toBe(0);
  });

  it("es continua en M0", () => {
    expect(tasaDesercion(59.999, PARAMS)).toBeCloseTo(0, 4);
  });

  it("crece al bajar la moral", () => {
    expect(tasaDesercion(30, PARAMS)).toBeGreaterThan(tasaDesercion(50, PARAMS));
  });

  it("con M = 0 el ejército se disuelve entero", () => {
    expect(tasaDesercion(0, PARAMS)).toBe(1);
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const e = ej({ M: 0 });
    st.ejercitos.set(e.id, e);
    desertar(st, e);
    expect(e.S).toBe(0);
    expect(e.vivo).toBe(false);
  });
});

describe("moral por turno (ecs. 3.26-3.27)", () => {
  it("en paz y en casa recupera hacia 100", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const e = ej({ M: 50 });
    actualizarMoral(st, e, 0, 0, true);
    expect(e.M).toBeGreaterThan(50);
  });

  it("no recupera si combatió este turno", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const e = ej({ M: 50, combatioEsteTurno: true });
    actualizarMoral(st, e, 0, 0, true);
    expect(e.M).toBe(50);
  });

  it("la escasez y la quiebra la bajan", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const e = ej({ M: 90, combatioEsteTurno: true });
    actualizarMoral(st, e, 1, 1, true);
    expect(e.M).toBe(90 - PARAMS.deltaH - PARAMS.deltaQ);
  });

  it("queda siempre en [0, 100]", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const e = ej({ M: 5, combatioEsteTurno: true });
    actualizarMoral(st, e, 1, 1, false);
    expect(e.M).toBe(0);
  });
});
