import { describe, it, expect } from "vitest";
import { unaCorrida, correrLote, NIVELES_A, NIVELES_B, SEMILLAS } from "./runner";

describe("diseño experimental (§7)", () => {
  it("es un factorial 3×3 con 30 réplicas", () => {
    expect(NIVELES_A).toEqual([3, 5, 8]);
    expect(NIVELES_B).toEqual([0.05, 0.1, 0.2]);
    expect(SEMILLAS).toHaveLength(30);
  });

  it("usa el MISMO vector de semillas en todas las celdas (§3.6.4)", () => {
    // Números aleatorios comunes: es lo que hace comparables las configuraciones.
    expect(new Set(SEMILLAS).size).toBe(30);
    expect(SEMILLAS[0]).toBe(1000);
    expect(SEMILLAS[29]).toBe(1029);
  });
});

describe("una corrida", () => {
  it("devuelve los factores que se le pidieron", () => {
    const c = unaCorrida(5, 0.2, 1000);
    expect(c.nJugadores).toBe(5);
    expect(c.gamma).toBe(0.2);
    expect(c.semilla).toBe(1000);
  });

  it("es reproducible", () => {
    expect(unaCorrida(5, 0.1, 1007)).toEqual(unaCorrida(5, 0.1, 1007));
  });

  it("gamma afecta el resultado — el Factor B hace algo", () => {
    const bajo = SEMILLAS.slice(0, 10).map((s) => unaCorrida(5, 0.05, s).tVic);
    const alto = SEMILLAS.slice(0, 10).map((s) => unaCorrida(5, 0.2, s).tVic);
    expect(bajo).not.toEqual(alto);
  });

  it("no filtra estado entre corridas", () => {
    const sola = unaCorrida(8, 0.1, 1003);
    unaCorrida(3, 0.05, 1011);              // otra corrida en el medio
    unaCorrida(5, 0.2, 1020);
    expect(unaCorrida(8, 0.1, 1003)).toEqual(sola);
  });

  it("colapsados nunca supera a los que llegaron al 40 % (ec. 3.37)", () => {
    for (const s of SEMILLAS.slice(0, 8)) {
      const c = unaCorrida(8, 0.1, s);
      expect(c.colapsados).toBeLessThanOrEqual(c.llegaronA40);
    }
  });
});

describe("el lote completo", () => {
  it("produce 270 corridas en 9 celdas", () => {
    const { corridas, celdas } = correrLote();
    expect(corridas).toHaveLength(270);
    expect(celdas).toHaveLength(9);
    for (const celda of celdas) expect(celda.n).toBe(30);
  }, 120_000);

  it("informa el progreso una vez por celda", () => {
    const vistos: number[] = [];
    correrLote((hechas, total) => { vistos.push(hechas); expect(total).toBe(270); });
    expect(vistos).toEqual([30, 60, 90, 120, 150, 180, 210, 240, 270]);
  }, 120_000);

  it("el lote es reproducible", () => {
    const a = correrLote().corridas.map((c) => c.tVic);
    const b = correrLote().corridas.map((c) => c.tVic);
    expect(a).toEqual(b);
  }, 240_000);
});
