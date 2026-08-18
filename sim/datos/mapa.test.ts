import { describe, it, expect } from "vitest";
import { MAPA25, CAPITALES, distancias } from "./mapa";
import { PARAMS } from "./parametros";

describe("mapa de 25 provincias (§4.1 del spec)", () => {
  it("tiene 25 provincias con ids 0..24", () => {
    expect(MAPA25).toHaveLength(25);
    expect(MAPA25.map((p) => p.id)).toEqual([...Array(25).keys()]);
  });

  it("la adyacencia es simétrica", () => {
    for (const p of MAPA25)
      for (const v of p.vecinos)
        expect(MAPA25[v].vecinos).toContain(p.id);
  });

  it("ninguna provincia es vecina de sí misma ni repite vecinos", () => {
    for (const p of MAPA25) {
      expect(p.vecinos).not.toContain(p.id);
      expect(new Set(p.vecinos).size).toBe(p.vecinos.length);
    }
  });

  it("el grafo es conexo", () => {
    const visto = new Set([0]);
    const cola = [0];
    while (cola.length) for (const v of MAPA25[cola.pop()!].vecinos)
      if (!visto.has(v)) { visto.add(v); cola.push(v); }
    expect(visto.size).toBe(25);
  });

  it("reparte 1 centro, 8 interiores y 16 de borde", () => {
    const porK = (k: number) => MAPA25.filter((p) => p.K === k).length;
    expect(porK(20_000)).toBe(1);
    expect(porK(14_000)).toBe(8);
    expect(porK(7_000)).toBe(16);
  });

  it("el centro es rico y llano; el borde pobre y defendible", () => {
    const centro = MAPA25.find((p) => p.K === 20_000)!;
    const borde = MAPA25.find((p) => p.K === 7_000)!;
    expect(centro.aE).toBeGreaterThan(borde.aE);
    expect(centro.D).toBeLessThan(borde.D);
  });

  it("hay capitales distintas y de borde para 3, 5 y 8 jugadores", () => {
    for (const n of [3, 5, 8]) {
      const caps = CAPITALES[n];
      expect(caps).toHaveLength(n);
      expect(new Set(caps).size).toBe(n);
      for (const c of caps) expect(MAPA25[c].K).toBe(7_000);
    }
  });

  it("a_i alcanza para sostener una capital sin déficit alimentario inicial", () => {
    // 500 es S0, el tamaño de ejército inicial de una capital (ver sim/inicial.ts).
    // Con la mitad de la población de K y el ejército inicial completo, la
    // producción de comida no debe ser menor al consumo civil + militar.
    for (const p of MAPA25) {
      const consumoMinimo = PARAMS.alpha * (0.5 * p.K) + PARAMS.sigma * 500;
      expect(p.a).toBeGreaterThanOrEqual(consumoMinimo);
    }
  });

  it("distancias son BFS simétricas con diagonal cero", () => {
    const d = distancias(MAPA25);
    expect(d[0][0]).toBe(0);
    expect(d[0][24]).toBe(d[24][0]);
    expect(d[0][1]).toBe(1);
    expect(d[0][24]).toBeGreaterThan(1);
  });
});
