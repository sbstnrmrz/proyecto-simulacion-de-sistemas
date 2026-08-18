import { describe, it, expect } from "vitest";
import { correrLote, NIVELES_A, NIVELES_B, SEMILLAS } from "./runner";
import { anovaDosFactores } from "./anova";

describe("el experimento del §7 produce un análisis válido", () => {
  const r = correrLote();

  it("cubre las nueve celdas con 30 réplicas cada una", () => {
    for (const a of NIVELES_A)
      for (const b of NIVELES_B) {
        const celda = r.corridas.filter((c) => c.nJugadores === a && c.gamma === b);
        expect(celda).toHaveLength(30);
        expect(new Set(celda.map((c) => c.semilla))).toEqual(new Set(SEMILLAS));
      }
  }, 180_000);

  it("la tasa de colapso es medible en al menos una celda", () => {
    // Si ninguna celda tuviera denominador, el Objetivo 2 no se podría medir.
    const medibles = r.celdas.filter((c) => c.tasaColapso !== null);
    expect(medibles.length).toBeGreaterThan(0);
  }, 180_000);

  it("los intervalos de confianza contienen a su media", () => {
    for (const c of r.celdas) {
      expect(c.ic95[0]).toBeLessThanOrEqual(c.mediaTVic);
      expect(c.ic95[1]).toBeGreaterThanOrEqual(c.mediaTVic);
    }
  }, 180_000);

  it("el ANOVA descompone la variación sin residuo", () => {
    const obs = r.corridas.map((c) => ({
      a: NIVELES_A.indexOf(c.nJugadores),
      b: NIVELES_B.indexOf(c.gamma),
      y: c.tVic,
    }));
    const t = anovaDosFactores(obs);
    expect(t.a.sc + t.b.sc + t.ab.sc + t.error.sc).toBeCloseTo(t.total.sc, 6);
    expect(t.error.gl).toBe(261);      // 9 celdas × 29
    expect(t.total.gl).toBe(269);      // 270 − 1
  }, 180_000);

  it("ninguna corrida supera el horizonte", () => {
    for (const c of r.corridas) expect(c.tVic).toBeLessThanOrEqual(300);
  }, 180_000);
});
