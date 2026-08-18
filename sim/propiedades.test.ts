import { describe, it, expect } from "vitest";
import { verificarDominios } from "./invariantes";
import { resolverBatalla } from "./combate";
import { correr, pasoTurno } from "./motor";
import { crearPartida, configPorDefecto } from "./inicial";

describe("dominios del §2.1 a lo largo de partidas completas", () => {
  it("ninguna variable sale de su dominio en 20 partidas", () => {
    for (let s = 1; s <= 20; s++) {
      const st = crearPartida(configPorDefecto({ semilla: s, nJugadores: 5 }));
      while (!st.fin && st.t < st.params.tMax) {
        pasoTurno(st);
        const violaciones = verificarDominios(st);
        expect(violaciones, `semilla ${s}, turno ${st.t}`).toEqual([]);
      }
    }
  }, 60_000);
});

describe("propiedades del §8 del spec", () => {
  it("toda corrida termina, en las tres configuraciones de jugadores", () => {
    for (const n of [3, 5, 8])
      for (let s = 1; s <= 5; s++) {
        const r = correr(crearPartida(configPorDefecto({ semilla: s, nJugadores: n })));
        expect(r.tVic).toBeLessThanOrEqual(300);
      }
  }, 30_000);

  it("la partida es sensible al Factor B (γ produce algún efecto medible)", () => {
    // No se afirma una dirección — eso es lo que el experimento de la Fase 2
    // tiene que descubrir. Sólo se afirma que γ no es un parámetro inerte:
    // cambiarlo cambia las trayectorias territoriales observadas.
    const maxFracsPorConfig = (gamma: number) => {
      const salidas: number[][] = [];
      for (let s = 1; s <= 10; s++) {
        const cfg = configPorDefecto({ semilla: s, nJugadores: 5 });
        cfg.params.gamma = gamma;
        const st = crearPartida(cfg);
        correr(st);
        const maxPorJugador = st.jugadores.map((j) => Math.max(...st.series.nFrac[j.id]));
        salidas.push(maxPorJugador);
      }
      return salidas;
    };

    const bajo = maxFracsPorConfig(0.05);
    const alto = maxFracsPorConfig(0.2);

    expect(bajo.every((v) => v.every((x) => Number.isFinite(x)))).toBe(true);
    expect(alto.every((v) => v.every((x) => Number.isFinite(x)))).toBe(true);

    const difiere = bajo.some((serieBaja, i) => {
      const serieAlta = alto[i];
      return serieBaja.some((x, j) => x !== serieAlta[j]);
    });
    expect(difiere).toBe(true);
  }, 30_000);

  it("el signo de la invariante 3.18 predice al ganador (validación del §7)", () => {
    // Con ventaja de fuerza efectiva ≥ 1,5× el atacante debe ganar > 90 % de las
    // veces, incluso en el peor ruido (ε = 0,80 atacante / 1,20 defensor).
    let victorias = 0;
    const N = 200;
    for (let s = 1; s <= N; s++) {
      const st = crearPartida(configPorDefecto({ semilla: s, nJugadores: 3 }));
      const objetivo = st.provincias.find((p) => p.c === -1)!;
      objetivo.D = 0;
      const def = [...st.ejercitos.values()].find((e) => e.u === objetivo.id)!;
      const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
      def.S = 500; def.M = 80; def.X = 0;
      atk.S = 1000; atk.M = 80; atk.X = 0;   // qA·A₀² / qD·D₀² = 4 ≫ 1
      if (resolverBatalla(st, atk.id, objetivo.id, atk.u).ataqueExitoso) victorias++;
    }
    expect(victorias / N).toBeGreaterThan(0.9);
  }, 20_000);

  it("colapso implica haber llegado al 40 % (ec. 3.37)", () => {
    for (let s = 1; s <= 10; s++) {
      const r = correr(crearPartida(configPorDefecto({ semilla: s, nJugadores: 8 })));
      for (const c of r.colapsos) if (c.colapso) expect(c.llegoA40).toBe(true);
    }
  }, 30_000);
});
