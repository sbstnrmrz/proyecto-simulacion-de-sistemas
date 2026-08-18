import { describe, it, expect } from "vitest";
import { verificarDominios } from "./invariantes";
import { factorCalidad, invariante, resolverBatalla } from "./combate";
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

  it("el signo de la invariante 3.18 predice al ganador entre las batallas que se resuelven (validación del §7)", () => {
    // La ec. 3.18 describe el modelo CONTINUO de Lanchester, corrido hasta la
    // aniquilación de un bando. El §3.5.3 trunca cada batalla en NR rondas
    // (NR=5 con lambda=0,08 en sim/datos/parametros.ts), y con esos valores
    // una razón de fuerzas de entre ~1,5 y 3 no alcanza a cruzar el umbral de
    // retirada (epsRet=0,25) ni de aniquilación dentro de esas 5 rondas: la
    // batalla "agota las rondas" sin que nadie gane, un artefacto de la
    // discretización, no del signo de la invariante. La validación del §7 sólo
    // tiene sentido sobre las batallas que efectivamente SE RESUELVEN (por
    // aniquilación o por retirada) — se descartan las agotadas, y se exige
    // además una muestra mínima de resueltas para que el test no pase
    // trivialmente con cero casos.
    let resueltas = 0;
    let aciertos = 0;
    const D0 = 500;
    const razones = [0.3, 0.5, 0.75, 1, 1.3, 1.5, 2, 3, 4, 5, 7, 10];
    let s = 0;
    for (const razon of razones) {
      for (let rep = 1; rep <= 25; rep++) {
        s++;
        const st = crearPartida(configPorDefecto({ semilla: s, nJugadores: 3 }));
        const P = st.params;
        const objetivo = st.provincias.find((p) => p.c === -1)!;
        objetivo.D = 0;
        const def = [...st.ejercitos.values()].find((e) => e.u === objetivo.id)!;
        const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
        const A0 = Math.round(D0 * razon);
        def.S = D0; def.M = 80; def.X = 0;
        atk.S = A0; atk.M = 80; atk.X = 0;

        const jugA = st.jugadores[atk.jugador];
        const jugD = def.jugador >= 0 ? st.jugadores[def.jugador] : null;
        const qA = factorCalidad(atk, jugA?.betaAtk ?? 0, 0);
        const qD = factorCalidad(def, jugD?.betaDef ?? 0, objetivo.D);
        const inv = invariante(qA, A0, qD, D0);

        const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);

        // Agotada ⟺ se acabaron las rondas sin que ningún bando cruzara su
        // umbral (ni aniquilación ni retirada). Eso es lo que se descarta.
        const agotada = r.rondas === P.NR && r.A > 0 && r.D > 0 &&
          r.A >= P.epsRet * A0 && r.D >= P.epsRet * D0;
        if (agotada) continue;

        resueltas++;
        const prediceExito = inv > 0;
        if (prediceExito === r.ataqueExitoso) aciertos++;
      }
    }

    expect(resueltas).toBeGreaterThan(50);
    expect(aciertos / resueltas).toBeGreaterThan(0.9);
  }, 20_000);

  it("colapso implica haber llegado al 40 % (ec. 3.37)", () => {
    for (let s = 1; s <= 10; s++) {
      const r = correr(crearPartida(configPorDefecto({ semilla: s, nJugadores: 8 })));
      for (const c of r.colapsos) if (c.colapso) expect(c.llegoA40).toBe(true);
    }
  }, 30_000);
});
