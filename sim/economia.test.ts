import { describe, it, expect } from "vitest";
import { etaOperatividad, ingreso, consumo, gasto, balanceAlimentario, verificarQuiebra, produccion } from "./economia";
import { crearPartida, configPorDefecto } from "./inicial";

describe("operatividad (ec. 5.1)", () => {
  it("vale 1 / 0 / 0,25", () => {
    expect(etaOperatividad("normal")).toBe(1);
    expect(etaOperatividad("asediada")).toBe(0);
    expect(etaOperatividad("rebelde")).toBe(0.25);
  });
});

describe("ingreso y gasto (ecs. 3.7-3.8)", () => {
  it("el ingreso escala con población, riqueza y operatividad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const base = ingreso(st, j);
    expect(base).toBeGreaterThan(0);

    const p = st.provincias.find((x) => x.c === 0)!;
    p.estado = "asediada";
    expect(ingreso(st, j)).toBe(0);
  });

  it("a_i^E entra en el ingreso (errata §5.4 del spec)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const antes = ingreso(st, j);
    st.provincias.find((x) => x.c === 0)!.aE *= 1.3;   // descubrimiento de oro
    expect(ingreso(st, j)).toBeCloseTo(antes * 1.3, 6);
  });

  it("la sobrecarga administrativa crece con la fracción del mapa", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const chico = gasto(st, j);
    for (const p of st.provincias) p.c = 0;            // se queda con todo
    expect(gasto(st, j)).toBeGreaterThan(chico);
  });

  it("una provincia despoblada no produce comida (errata §5.3 del spec)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    expect(produccion(st, j)).toBeGreaterThan(0);
    st.provincias.find((x) => x.c === 0)!.Pob = 0;
    expect(produccion(st, j)).toBe(0);
  });
});

describe("balance alimentario (ecs. 3.4-3.6)", () => {
  it("sin déficit, s_j = 0 y la reserva crece", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 10_000;
    const sj = balanceAlimentario(st, j);
    expect(sj).toBe(0);
    expect(j.F).toBeGreaterThanOrEqual(0);
  });

  it("con déficit, s_j ∈ (0,1] y la reserva queda en 0", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 0;
    for (const p of st.provincias) if (p.c === 0) p.a = 0;   // sin producción
    const sj = balanceAlimentario(st, j);
    expect(sj).toBeGreaterThan(0);
    expect(sj).toBeLessThanOrEqual(1);
    expect(j.F).toBe(0);
  });

  it("con consumo nulo, s_j = 0 por convenio (§5.3 — evita 0/0)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    for (const p of st.provincias) if (p.c === 0) p.Pob = 0;
    for (const e of st.ejercitos.values()) if (e.jugador === 0) e.vivo = false;
    expect(consumo(st, j)).toBe(0);
    expect(balanceAlimentario(st, j)).toBe(0);
  });
});

describe("quiebra (ec. 5.4)", () => {
  it("con tesoro sano no hace nada", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    expect(verificarQuiebra(st, j)).toBe(0);
  });

  it("disuelve ejércitos hasta equilibrar y siempre termina", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.E = -10_000;
    expect(verificarQuiebra(st, j)).toBe(1);
    expect(j.E).toBe(0);                                   // deuda condonada
    expect([...st.ejercitos.values()].filter((e) => e.jugador === 0 && e.vivo)).toHaveLength(0);
  });
});
