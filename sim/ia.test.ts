import { describe, it, expect } from "vitest";
import { razonFuerzas, amenaza, decidirIA } from "./ia";
import { crearPartida, configPorDefecto } from "./inicial";

describe("indicadores de la IA (ecs. 4.2-4.3)", () => {
  it("una provincia sin guarnición da razón grande pero finita (§5.3)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    for (const e of st.ejercitos.values()) if (e.u === objetivo.id) e.vivo = false;
    const r = razonFuerzas(st, objetivo.id, 0);
    expect(Number.isFinite(r)).toBe(true);
  });

  it("la amenaza es adimensional y no negativa (errata §5.5 del spec)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const th = amenaza(st, st.jugadores[0]);
    expect(th).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(th)).toBe(true);
  });
});

describe("guardas del árbol de decisión (§4.5)", () => {
  it("Guarda 1: sin comida ni oro, disuelve el peor ejército y pide tregua", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 0; j.E = 0;
    const antes = [...st.ejercitos.values()].filter((e) => e.jugador === 0 && e.vivo).length;
    decidirIA(st, j);
    const despues = [...st.ejercitos.values()].filter((e) => e.jugador === 0 && e.vivo).length;
    expect(despues).toBeLessThan(antes);
  });

  it("Guarda 3: con un objetivo rentable encola un movimiento", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 100_000; j.E = 100_000;
    for (const e of st.ejercitos.values()) if (e.jugador === 0) e.S = 50_000;
    const antes = st.lef.heap.length;
    decidirIA(st, j);
    expect(st.lef.heap.length).toBeGreaterThan(antes);
    expect(st.lef.heap.some((e) => e.tipo === "INICIO_MOVIMIENTO")).toBe(true);
  });

  it("Guarda 4: sin objetivos construye o investiga", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 100_000; j.E = 100_000;
    for (const e of st.ejercitos.values()) if (e.jugador !== 0) e.S = 10_000_000;
    decidirIA(st, j);
    const construyo = st.lef.heap.some((e) => e.tipo === "INICIO_CONSTRUCCION");
    expect(construyo || j.investigando !== null).toBe(true);
  });

  it("es determinista: mismo estado, misma decisión", () => {
    const a = crearPartida(configPorDefecto({ semilla: 3, nJugadores: 3 }));
    const b = crearPartida(configPorDefecto({ semilla: 3, nJugadores: 3 }));
    decidirIA(a, a.jugadores[0]);
    decidirIA(b, b.jugadores[0]);
    expect(a.lef.heap.map((e) => e.tipo)).toEqual(b.lef.heap.map((e) => e.tipo));
  });
});
