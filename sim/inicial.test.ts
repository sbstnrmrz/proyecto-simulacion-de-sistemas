import { describe, it, expect } from "vitest";
import { crearPartida, configPorDefecto } from "./inicial";

describe("estado inicial (§4.5 del spec)", () => {
  it("crea un jugador por capital, con 25 provincias en total", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 5 }));
    expect(st.jugadores).toHaveLength(5);
    expect(st.provincias).toHaveLength(25);
    expect(st.jugadores.every((j) => j.activo)).toBe(true);
  });

  it("cada jugador arranca con una provincia y un ejército de 500", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (const j of st.jugadores) {
      expect(st.provincias.filter((p) => p.c === j.id)).toHaveLength(1);
      const ejs = [...st.ejercitos.values()].filter((e) => e.jugador === j.id);
      expect(ejs).toHaveLength(1);
      expect(ejs[0].S).toBe(500);
      expect(ejs[0].M).toBe(80);
    }
  });

  it("las provincias neutrales tienen guarnición proporcional a la población", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const neutrales = st.provincias.filter((p) => p.c === -1);
    expect(neutrales).toHaveLength(22);
    for (const p of neutrales) {
      const g = [...st.ejercitos.values()].find((e) => e.u === p.id && e.jugador === -1);
      expect(g).toBeDefined();
      expect(g!.S).toBe(Math.ceil(0.02 * p.Pob));
    }
  });

  it("las provincias propias arrancan en el equilibrio de lealtad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (const p of st.provincias.filter((x) => x.c !== -1)) {
      expect(p.lealtad).toBe(70);
      expect(p.Pob).toBe(Math.floor(0.5 * p.K));
      expect(p.estado).toBe("normal");
    }
  });

  it("las relaciones arrancan neutras y simétricas", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 5 }));
    for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++)
      expect(st.relaciones[a][b]).toBe(0);
  });

  it("la LEF arranca con el INICIO_TURNO del turno 1 (§4.2)", () => {
    const st = crearPartida(configPorDefecto({}));
    expect(st.lef.heap).toHaveLength(1);
    expect(st.lef.heap[0].tipo).toBe("INICIO_TURNO");
    expect(st.lef.heap[0].t).toBe(1);
  });

  it("dos partidas con la misma semilla arrancan idénticas", () => {
    const a = crearPartida(configPorDefecto({ semilla: 7 }));
    const b = crearPartida(configPorDefecto({ semilla: 7 }));
    expect(JSON.stringify(a.provincias)).toBe(JSON.stringify(b.provincias));
    expect(a.rng.z).toBe(b.rng.z);
  });
});
