import { describe, it, expect } from "vitest";
import { razonFuerzas, amenaza, utilidad, decidirIA } from "./ia";
import { crearPartida, configPorDefecto } from "./inicial";
import { declararGuerra } from "./diplomacia";

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

describe("utilidad (ec. 4.4)", () => {
  // Todos los casos usan las provincias 1 y 5 (o 2 y 3), vecinas ambas de la
  // capital (provincia 0, ejército único de player0 al inicio), para poder
  // igualar tres de los cuatro términos y aislar el cuarto. Un test que
  // invierta el signo de cualquier w_i debe fallar en alguno de estos casos.
  it("w1: a igual distancia/a^E/rho, mayor población da mayor utilidad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const k = [...st.ejercitos.values()].find((e) => e.jugador === 0)!;
    const a = st.provincias[1], b = st.provincias[5];
    a.aE = b.aE = 1.0;
    const defA = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    const defB = [...st.ejercitos.values()].find((e) => e.u === 5)!;
    defA.S = defB.S = 100;               // misma guarnición: mismo rho en 1 y 5
    a.Pob = 9000; b.Pob = 100;
    expect(utilidad(st, j, 1, k.id)).toBeGreaterThan(utilidad(st, j, 5, k.id));
  });

  it("w2: a igual distancia/Pob/rho, mayor a^E da mayor utilidad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const k = [...st.ejercitos.values()].find((e) => e.jugador === 0)!;
    const a = st.provincias[1], b = st.provincias[5];
    a.Pob = b.Pob = 1000;
    const defA = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    const defB = [...st.ejercitos.values()].find((e) => e.u === 5)!;
    defA.S = defB.S = 100;
    a.aE = 3.0; b.aE = 0.5;
    expect(utilidad(st, j, 1, k.id)).toBeGreaterThan(utilidad(st, j, 5, k.id));
  });

  it("w3: a igual Pob/a^E/rho, menor distancia da mayor utilidad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const k = [...st.ejercitos.values()].find((e) => e.jugador === 0)!;   // u = 0
    // Provincias 2 y 3: dist(0,2)=2, dist(0,3)=3, ninguna vecina de 0, así
    // que Φ_ata = 0 para ambas y rho = 0 en las dos por igual.
    const a = st.provincias[2], b = st.provincias[3];
    a.Pob = b.Pob = 1000;
    a.aE = b.aE = 1.0;
    expect(utilidad(st, j, 2, k.id)).toBeGreaterThan(utilidad(st, j, 3, k.id));
  });

  it("w4: a igual distancia/Pob/a^E, mayor razón de fuerzas da mayor utilidad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    const k = [...st.ejercitos.values()].find((e) => e.jugador === 0)!;
    const a = st.provincias[1], b = st.provincias[5];
    a.Pob = b.Pob = 1000;
    a.aE = b.aE = 1.0;
    const defA = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    const defB = [...st.ejercitos.values()].find((e) => e.u === 5)!;
    defA.S = 1;        // guarnición débil en 1: rho alto
    defB.S = 5000;      // guarnición fuerte en 5: rho bajo
    expect(utilidad(st, j, 1, k.id)).toBeGreaterThan(utilidad(st, j, 5, k.id));
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

  it("Guarda 1: en guerra con el vecino más fuerte, propone una tregua", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 0; j.E = 0;
    st.provincias[1].c = 1;   // la provincia 1 (vecina de la capital 0) pasa a player1
    const guarnicion = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    guarnicion.jugador = 1;
    declararGuerra(st, 0, 1);
    decidirIA(st, j);
    const ev = st.lef.heap.find((e) => e.tipo === "PROPUESTA_ACUERDO");
    expect(ev).toBeDefined();
    expect(ev!.datos).toEqual({ de: 0, a: 1, tipo: "tregua" });
  });

  it("Guarda 1: en paz con el único vecino, no propone tregua", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 0; j.E = 0;
    st.provincias[1].c = 1;
    const guarnicion = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    guarnicion.jugador = 1;
    // sin declararGuerra: la relación queda en su valor de paz por defecto (0)
    decidirIA(st, j);
    expect(st.lef.heap.some((e) => e.tipo === "PROPUESTA_ACUERDO")).toBe(false);
  });

  it("Guarda 3: ataca la provincia de mayor utilidad con el ejército más cercano", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 100_000; j.E = 100_000;
    for (const e of st.ejercitos.values()) if (e.jugador === 0) e.S = 50_000;
    const capital = [...st.ejercitos.values()].find((e) => e.jugador === 0)!;   // u = 0

    // Segundo ejército de player0, lejos de las candidatas: si la Guarda 3
    // eligiera cualquier ejército propio en vez del más cercano, este test lo
    // detectaría.
    st.ejercitos.set(9999, {
      id: 9999, jugador: 0, S: 50_000, M: 80, X: 0, u: 12,
      combatioEsteTurno: false, vivo: true,
    });

    // Vecinos de la capital (todos neutrales): candidatas de la Guarda 3.
    const candidatas = [1, 5, 6];
    let mejor = candidatas[0], mejorU = -Infinity;
    for (const id of candidatas) {
      const u = utilidad(st, j, id, capital.id);
      if (u > mejorU) { mejorU = u; mejor = id; }
    }

    decidirIA(st, j);
    const ev = st.lef.heap.find((e) => e.tipo === "INICIO_MOVIMIENTO");
    expect(ev).toBeDefined();
    expect((ev!.datos as { destino: number }).destino).toBe(mejor);
    expect((ev!.datos as { ejercito: number }).ejercito).toBe(capital.id);
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

  it("Guarda 4: construye el mercado en la provincia sin mercado más poblada", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 100_000; j.E = 100_000;

    // player0 pasa a controlar también 1 y 5. Sus únicos vecinos externos
    // (6, 2 y 10) quedan en poder de player1 en paz: eso basta para vaciar
    // las candidatas de la Guarda 3 sin inflar ninguna guarnición (lo que
    // dispararía la Guarda 2 por amenaza).
    st.provincias[1].c = 0; st.provincias[1].Pob = 9000; st.provincias[1].mejoras = [];
    st.provincias[5].c = 0; st.provincias[5].Pob = 500; st.provincias[5].mejoras = [];
    st.provincias[0].mejoras = ["mercado"];   // la capital ya tiene mercado: debe quedar excluida
    st.provincias[0].Pob = 50_000;            // sería la elegida si el filtro ignorara el mercado
    for (const id of [2, 6, 10]) st.provincias[id].c = 1;
    st.relaciones[0][1] = st.relaciones[1][0] = 50;   // > rPaz: en paz, sin candidatas

    decidirIA(st, j);
    const ev = st.lef.heap.find((e) => e.tipo === "INICIO_CONSTRUCCION");
    expect(ev).toBeDefined();
    expect((ev!.datos as { provincia: number }).provincia).toBe(1);
  });

  it("es determinista: mismo estado, misma decisión", () => {
    const a = crearPartida(configPorDefecto({ semilla: 3, nJugadores: 3 }));
    const b = crearPartida(configPorDefecto({ semilla: 3, nJugadores: 3 }));
    decidirIA(a, a.jugadores[0]);
    decidirIA(b, b.jugadores[0]);
    expect(a.lef.heap.map((e) => e.tipo)).toEqual(b.lef.heap.map((e) => e.tipo));
  });
});
