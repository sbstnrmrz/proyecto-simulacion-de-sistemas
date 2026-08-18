import { describe, it, expect } from "vitest";
import {
  enGuerra, declararGuerra, actualizarRelaciones, actualizarLealtad, transicionEstado,
  vecinoMasFuerte,
} from "./diplomacia";
import { crearPartida, configPorDefecto } from "./inicial";

describe("diplomacia (ec. 3.30)", () => {
  it("declarar la guerra pone R en −100 en ambas celdas", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    declararGuerra(st, 0, 1);
    expect(st.relaciones[0][1]).toBe(-100);
    expect(st.relaciones[1][0]).toBe(-100);
    expect(enGuerra(st, 0, 1)).toBe(true);
  });

  it("en paz, la relación deriva hacia la neutralidad", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.relaciones[0][1] = st.relaciones[1][0] = 80;
    actualizarRelaciones(st, st.jugadores[0]);
    expect(st.relaciones[0][1]).toBeLessThan(80);
    expect(st.relaciones[0][1]).toBe(st.relaciones[1][0]);
  });

  it("en guerra la relación queda congelada en −100", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    declararGuerra(st, 0, 1);
    actualizarRelaciones(st, st.jugadores[0]);
    expect(st.relaciones[0][1]).toBe(-100);
  });

  it("R queda siempre en [−100, 100]", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.relaciones[0][1] = st.relaciones[1][0] = 100;
    for (let i = 0; i < 50; i++) actualizarRelaciones(st, st.jugadores[0]);
    expect(st.relaciones[0][1]).toBeGreaterThanOrEqual(-100);
    expect(st.relaciones[0][1]).toBeLessThanOrEqual(100);
  });
});

describe("vecinoMasFuerte (§4.5)", () => {
  it("elige, entre los vecinos de frontera, al de mayor fuerza total", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    // Provincias 1 y 5, vecinas de la capital de player0 (provincia 0), pasan
    // a player1 y player2 respectivamente.
    st.provincias[1].c = 1;
    st.provincias[5].c = 2;
    const e1 = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    const e2 = [...st.ejercitos.values()].find((e) => e.u === 5)!;
    e1.jugador = 1; e1.S = 1000;
    e2.jugador = 2; e2.S = 200;
    expect(vecinoMasFuerte(st, st.jugadores[0])).toBe(1);
  });

  it("desempata por menor id cuando las fuerzas son iguales", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.provincias[1].c = 1;
    st.provincias[5].c = 2;
    const e1 = [...st.ejercitos.values()].find((e) => e.u === 1)!;
    const e2 = [...st.ejercitos.values()].find((e) => e.u === 5)!;
    e1.jugador = 1; e1.S = 500;
    e2.jugador = 2; e2.S = 500;
    expect(vecinoMasFuerte(st, st.jugadores[0])).toBe(1);
  });

  it("devuelve null si no hay frontera con ningún jugador activo", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    expect(vecinoMasFuerte(st, st.jugadores[0])).toBe(null);
  });
});

describe("lealtad (ecs. 3.31-3.32)", () => {
  it("tiende al equilibrio Λ* = 70", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.lealtad = 20;
    for (let i = 0; i < 100; i++) actualizarLealtad(st, p, 0);
    expect(p.lealtad).toBeGreaterThan(60);
  });

  it("la escasez la desploma", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.lealtad = 70;
    actualizarLealtad(st, p, 1);
    expect(p.lealtad).toBeLessThan(70);
  });

  it("queda siempre en [0, 100]", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.lealtad = 1;
    for (let i = 0; i < 20; i++) actualizarLealtad(st, p, 1);
    expect(p.lealtad).toBeGreaterThanOrEqual(0);
  });

  it("Pob = 0 no aporta bonificación de guarnición (ec. 3.32)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.Pob = 0;
    p.lealtad = 50;
    // sin guarnición propia en p, y sin escasez (sj = 0): la lealtad solo se
    // mueve por el término de equilibrio de la ec. 3.31, sin bonificación g.
    actualizarLealtad(st, p, 0);
    expect(p.lealtad).toBeCloseTo(50 + st.params.rhoLambda * (st.params.lambdaEq - 50), 9);
  });
});

describe("transición de estado con histéresis (ec. 5.2)", () => {
  it("bajo Λ_crit se rebela", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.lealtad = 20;
    transicionEstado(st, p);
    expect(p.estado).toBe("rebelde");
  });

  it("NO vuelve a normal en la banda muerta [25, 40)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.estado = "rebelde"; p.lealtad = 30;
    transicionEstado(st, p);
    expect(p.estado).toBe("rebelde");     // ésta es la histéresis
    p.lealtad = 45;
    transicionEstado(st, p);
    expect(p.estado).toBe("normal");
  });

  it("un enemigo presente la pone en asedio, con precedencia", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const p = st.provincias.find((x) => x.c === 0)!;
    p.lealtad = 5;                         // también calificaría para rebelde
    const e = [...st.ejercitos.values()].find((x) => x.jugador === 1)!;
    e.u = p.id;
    transicionEstado(st, p);
    expect(p.estado).toBe("asediada");
  });
});
