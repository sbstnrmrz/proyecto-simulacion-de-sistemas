import { describe, it, expect } from "vitest";
import { recalcularBetas, disponibles, mejorTecnologia, iniciarInvestigacion, intentarCompletar } from "./tecnologia";
import { crearPartida, configPorDefecto } from "./inicial";

describe("tecnología (ecs. 3.11-3.13)", () => {
  it("las bonificaciones son aditivas dentro de cada rama", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.tecnologias.add("arado");
    j.tecnologias.add("rutas");
    recalcularBetas(j);
    expect(j.betaEco).toBeCloseTo(0.4, 10);
    expect(j.betaAtk).toBe(0);
  });

  it("sólo ofrece tecnologías con prerrequisitos cumplidos", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    expect(disponibles(j)).not.toContain("rutas");
    j.tecnologias.add("arado");
    expect(disponibles(j)).toContain("rutas");
    expect(disponibles(j)).not.toContain("arado");   // ya la tiene
  });

  it("no completa antes del tiempo mínimo D_θ (ec. 3.12)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    st.t = 1;
    iniciarInvestigacion(st, j, "arado");
    j.RD = 10_000;                    // costo de sobra
    st.t = 3;                         // t0 + 3 < t0 + D_θ = t0 + 5
    expect(intentarCompletar(st, j)).toBe(false);
    st.t = 6;
    expect(intentarCompletar(st, j)).toBe(true);
  });

  it("al completar descuenta C_θ y actualiza las betas", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    st.t = 1;
    iniciarInvestigacion(st, j, "arado");
    j.RD = 500;
    st.t = 10;
    intentarCompletar(st, j);
    expect(j.tecnologias.has("arado")).toBe(true);
    expect(j.RD).toBe(200);           // 500 − 300
    expect(j.betaEco).toBeCloseTo(0.15, 10);
    expect(j.investigando).toBeNull();
  });

  it("mejorTecnologia prefiere la más barata disponible", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    expect(["arado", "herreria", "muralla_seca"]).toContain(mejorTecnologia(st.jugadores[0]));
  });

  it("mejorTecnologia elige la de 300 y no la de 900 cuando ambas están disponibles", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.tecnologias.add("arado");   // habilita rutas (C=900) junto a herreria/muralla_seca (C=300)
    const elegida = mejorTecnologia(j);
    expect(elegida).not.toBe("rutas");
    expect(["herreria", "muralla_seca"]).toContain(elegida);
  });

  it("iniciarInvestigacion no reemplaza una investigación en curso", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    expect(iniciarInvestigacion(st, j, "arado")).toBe(true);
    expect(iniciarInvestigacion(st, j, "herreria")).toBe(false);
    expect(j.investigando?.tec).toBe("arado");
  });
});
