import { describe, it, expect } from "vitest";
import { factorCalidad, fuerzaEfectiva, invariante, resolverBatalla } from "./combate";
import { crearPartida, configPorDefecto } from "./inicial";
import type { Ejercito } from "./tipos";

const ej = (over: Partial<Ejercito> = {}): Ejercito => ({
  id: 0, jugador: 0, S: 1000, M: 80, X: 0, u: 0,
  combatioEsteTurno: false, vivo: true, ...over,
});

describe("traza de verificación del §4.6 — test de aceptación", () => {
  // Roma (ej. 10) ataca Burgos, defendida por Cartago (ej. 23).
  const atacante = ej({ id: 10, jugador: 0, S: 1200, X: 20, M: 80 });
  const defensor = ej({ id: 23, jugador: 1, S: 900, X: 10, M: 90 });
  const D_BURGOS = 25;

  it("qA = 0,96", () => {
    expect(factorCalidad(atacante, 0, 0)).toBeCloseTo(0.96, 10);
  });

  it("qD = 1,2375", () => {
    expect(factorCalidad(defensor, 0, D_BURGOS)).toBeCloseTo(1.2375, 10);
  });

  it("qA·A₀² = 1 382 400 y qD·D₀² = 1 002 375", () => {
    const qA = factorCalidad(atacante, 0, 0);
    const qD = factorCalidad(defensor, 0, D_BURGOS);
    expect(qA * atacante.S ** 2).toBeCloseTo(1_382_400, 6);
    expect(qD * defensor.S ** 2).toBeCloseTo(1_002_375, 6);
  });

  it("la invariante 3.18 anticipa victoria del atacante", () => {
    const qA = factorCalidad(atacante, 0, 0);
    const qD = factorCalidad(defensor, 0, D_BURGOS);
    expect(invariante(qA, atacante.S, qD, defensor.S)).toBeGreaterThan(0);
  });
});

describe("fuerza efectiva (ec. 3.16)", () => {
  it("Φ_k = S_k · q_k", () => {
    const e = ej({ S: 500 });
    expect(fuerzaEfectiva(e, 1.2)).toBe(600);
  });
});

describe("resolución por rondas (ecs. 3.19-3.23)", () => {
  it("una provincia sin guarnición se conquista sin rondas", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    for (const e of st.ejercitos.values()) if (e.u === objetivo.id) e.vivo = false;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);
    expect(r.rondas).toBe(0);
    expect(r.ataqueExitoso).toBe(true);
  });

  it("el empate exacto favorece al defensor (§3.5.3)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const def = [...st.ejercitos.values()].find((e) => e.u === objetivo.id)!;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    def.S = atk.S; def.M = atk.M; def.X = atk.X;
    objetivo.D = 0;
    const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);
    // qA = qD, A0 = D0 = 500 ⇒ la batalla siempre termina por agotamiento
    // con ambos bandos ~340, muy por encima del umbral de retirada (125):
    // ataqueExitoso es false de forma determinista, sin condicionar el assert.
    expect(r.ataqueExitoso).toBe(false);
  });

  it("perder BAJA la moral en la magnitud exacta — errata §5.2 del spec", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const def = [...st.ejercitos.values()].find((e) => e.u === objetivo.id)!;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    def.S = 50_000;                       // el atacante no tiene chance
    const moralAntes = atk.M;
    const A0 = atk.S;
    const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);
    expect(r.ataqueExitoso).toBe(false);
    // Con el signo invertido (omegaD = −20, justo el bug que la errata
    // previene) la caída sería omegaV − costoA en vez de omegaD + costoA:
    // para deltaB=40, costoA=40 la diferencia (20 vs 60) es indistinguible
    // de "menor que antes" sola, así que se afirma la magnitud exacta.
    const fraccionBajas = (A0 - r.A) / A0;
    // Magnitudes del §2.4 fijas como literales — NO st.params.* — porque este
    // es un test de calibración: debe fallar tanto si la fórmula invierte el
    // signo como si alguien pone omegaD: -20 en parametros.ts (la errata que
    // §5.2 previene). Leer st.params.omegaD cancelaría ambos errores a la vez.
    const caidaEsperada = 20 /* omegaD */ + 40 /* deltaB */ * fraccionBajas;
    expect(moralAntes - atk.M).toBeCloseTo(caidaEsperada, 10);
  });

  it("ganar SUBE la moral en la magnitud exacta — errata §5.2 del spec", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const def = [...st.ejercitos.values()].find((e) => e.u === objetivo.id)!;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    def.S = 1;                            // el defensor no tiene chance
    const moralAntes = atk.M;
    const A0 = atk.S;
    const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);
    expect(r.ataqueExitoso).toBe(true);
    const fraccionBajas = (A0 - r.A) / A0;
    // Ídem: literales del §2.4, no st.params.*, para no cancelar un signo
    // invertido en la fórmula con el mismo signo invertido en el parámetro.
    const subidaEsperada = 10 /* omegaV */ - 40 /* deltaB */ * fraccionBajas;
    expect(atk.M - moralAntes).toBeCloseTo(subidaEsperada, 10);
  });

  it("no se repliega a un origen que ya no es propio (§4.4)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const def = [...st.ejercitos.values()].find((e) => e.u === objetivo.id)!;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    def.S = 50_000;                       // el atacante no tiene chance
    const origenProv = st.provincias.find(
      (p) => p.id !== objetivo.id && p.id !== atk.u)!;
    origenProv.c = 1;                     // el origen cayó en manos enemigas este turno
    const uAntes = atk.u;
    const r = resolverBatalla(st, atk.id, objetivo.id, origenProv.id);
    expect(r.ataqueExitoso).toBe(false);
    expect(atk.u).not.toBe(origenProv.id);
    expect(atk.u).toBe(uAntes);
  });

  it("nunca deja efectivos negativos ni moral fuera de [0,100]", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);
    expect(r.A).toBeGreaterThanOrEqual(0);
    expect(r.D).toBeGreaterThanOrEqual(0);
    expect(atk.M).toBeGreaterThanOrEqual(0);
    expect(atk.M).toBeLessThanOrEqual(100);
    expect(atk.X).toBeLessThanOrEqual(100);
  });

  it("no supera N_R rondas", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const atk = [...st.ejercitos.values()].find((e) => e.jugador === 0 && e.vivo)!;
    const r = resolverBatalla(st, atk.id, objetivo.id, atk.u);
    expect(r.rondas).toBeLessThanOrEqual(st.params.NR);
  });
});
