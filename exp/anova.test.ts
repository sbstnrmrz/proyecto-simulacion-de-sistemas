import { describe, it, expect } from "vitest";
import { anovaDosFactores, type Observacion } from "./anova";

/** Diseño 2×2 con 2 réplicas, calculado a mano para fijar la aritmética. */
const DATOS: Observacion[] = [
  { a: 0, b: 0, y: 10 }, { a: 0, b: 0, y: 12 },
  { a: 0, b: 1, y: 20 }, { a: 0, b: 1, y: 22 },
  { a: 1, b: 0, y: 14 }, { a: 1, b: 0, y: 16 },
  { a: 1, b: 1, y: 24 }, { a: 1, b: 1, y: 26 },
];

describe("ANOVA de dos factores (§7)", () => {
  it("descompone la suma de cuadrados: SST = SSA + SSB + SSAB + SSE", () => {
    const t = anovaDosFactores(DATOS);
    expect(t.a.sc + t.b.sc + t.ab.sc + t.error.sc).toBeCloseTo(t.total.sc, 8);
  });

  it("reparte los grados de libertad correctamente", () => {
    const t = anovaDosFactores(DATOS);
    expect(t.a.gl).toBe(1);        // niveles de A − 1
    expect(t.b.gl).toBe(1);
    expect(t.ab.gl).toBe(1);       // (2−1)(2−1)
    expect(t.error.gl).toBe(4);    // ab(n−1) = 4·1
    expect(t.total.gl).toBe(7);    // N − 1
  });

  it("reproduce los valores calculados a mano", () => {
    // medias: A0=16, A1=20 -> SSA = 4·(16−18)² + 4·(20−18)² = 32
    // medias: B0=13, B1=23 -> SSB = 4·(13−18)² + 4·(23−18)² = 200
    // sin interacción por construcción -> SSAB = 0
    // dentro de cada celda: (±1)² × 8 = 8
    const t = anovaDosFactores(DATOS);
    expect(t.a.sc).toBeCloseTo(32, 8);
    expect(t.b.sc).toBeCloseTo(200, 8);
    expect(t.ab.sc).toBeCloseTo(0, 8);
    expect(t.error.sc).toBeCloseTo(8, 8);
  });

  it("F = CM del efecto sobre CM del error", () => {
    const t = anovaDosFactores(DATOS);
    expect(t.a.f).toBeCloseTo(t.a.cm / t.error.cm, 8);
    expect(t.b.f!).toBeGreaterThan(t.a.f!);   // el efecto de B es mayor
  });

  it("detecta interacción cuando la hay", () => {
    const conInteraccion: Observacion[] = [
      { a: 0, b: 0, y: 10 }, { a: 0, b: 0, y: 10 },
      { a: 0, b: 1, y: 20 }, { a: 0, b: 1, y: 20 },
      { a: 1, b: 0, y: 20 }, { a: 1, b: 0, y: 20 },
      { a: 1, b: 1, y: 10 }, { a: 1, b: 1, y: 10 },
    ];
    const t = anovaDosFactores(conInteraccion);
    expect(t.ab.sc).toBeGreaterThan(0);
    expect(t.a.sc).toBeCloseTo(0, 8);   // sin efectos principales
    expect(t.b.sc).toBeCloseTo(0, 8);
  });

  it("con error cero devuelve F nulo en vez de infinito", () => {
    const sinRuido: Observacion[] = [
      { a: 0, b: 0, y: 10 }, { a: 0, b: 0, y: 10 },
      { a: 0, b: 1, y: 20 }, { a: 0, b: 1, y: 20 },
      { a: 1, b: 0, y: 30 }, { a: 1, b: 0, y: 30 },
      { a: 1, b: 1, y: 40 }, { a: 1, b: 1, y: 40 },
    ];
    const t = anovaDosFactores(sinRuido);
    expect(t.error.cm).toBe(0);
    expect(t.a.f).toBeNull();
  });

  it("rechaza un diseño desbalanceado en vez de dar números equivocados", () => {
    const desbalanceado: Observacion[] = [
      { a: 0, b: 0, y: 1 }, { a: 0, b: 0, y: 2 },
      { a: 0, b: 1, y: 3 },
      { a: 1, b: 0, y: 4 }, { a: 1, b: 0, y: 5 },
      { a: 1, b: 1, y: 6 }, { a: 1, b: 1, y: 7 },
    ];
    expect(() => anovaDosFactores(desbalanceado)).toThrow(/balance/i);
  });
});
