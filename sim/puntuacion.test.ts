import { describe, it, expect } from "vitest";
import { calcularPuntuacion, evaluarVictoria } from "./puntuacion";
import { crearPartida, configPorDefecto } from "./inicial";

describe("puntuación (ec. 3.33)", () => {
  it("un jugador que tiene todo saca 100", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (const p of st.provincias) p.c = 0;
    for (const e of [...st.ejercitos.values()]) if (e.jugador !== 0) e.vivo = false;
    for (const id of ["arado", "rutas", "herreria", "asedio", "muralla_seca", "fortificacion"] as const)
      st.jugadores[0].tecnologias.add(id);
    expect(calcularPuntuacion(st, st.jugadores[0])).toBeCloseTo(100, 6);
  });

  it("la suma de puntuaciones no supera 100", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 5 }));
    const total = st.jugadores.reduce((s, j) => s + calcularPuntuacion(st, j), 0);
    expect(total).toBeLessThanOrEqual(100.0001);
  });
});

describe("condiciones de victoria (§3.9)", () => {
  it("dominación: queda un solo jugador", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.jugadores[1].activo = false;
    st.jugadores[2].activo = false;
    evaluarVictoria(st);
    expect(st.fin).not.toBeNull();
    expect(st.fin!.motivo).toBe("dominacion");
    expect(st.fin!.ganador).toBe(0);
  });

  it("puntuación: alguien supera θ_V", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (const p of st.provincias) if (p.c === -1) p.c = 0;
    evaluarVictoria(st);
    expect(st.fin!.motivo).toBe("puntuacion");
  });

  it("horizonte: en t = Tmax gana el de mayor V, desempate por menor id", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.t = st.params.tMax;
    evaluarVictoria(st);
    expect(st.fin!.motivo).toBe("horizonte");
    expect(st.fin!.ganador).toBe(0);      // empate exacto → menor id
  });

  it("sin condición cumplida no termina", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.t = 5;
    evaluarVictoria(st);
    expect(st.fin).toBeNull();
  });
});
