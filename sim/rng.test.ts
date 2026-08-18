import { describe, it, expect } from "vitest";
import { u, uniforme, uniformeDiscreta, bernoulli, empirica, type Rng } from "./rng";

describe("GCL (§3.6.1 del modelo)", () => {
  it("reproduce a mano la primera iteración con Z0 = 1", () => {
    // Z1 = (1 664 525·1 + 1 013 904 223) mod 2^32 = 1 015 568 748
    const rng: Rng = { z: 1 };
    u(rng);
    expect(rng.z).toBe(1_015_568_748);
  });

  it("la multiplicación es exacta en doubles para el peor caso", () => {
    // 1 664 525 × (2^32 − 1) ≈ 7,149e15 < 2^53 ≈ 9,007e15.
    const peor = 1_664_525 * (2 ** 32 - 1) + 1_013_904_223;
    expect(Number.isSafeInteger(peor)).toBe(true);
  });

  it("misma semilla, misma secuencia", () => {
    const a: Rng = { z: 42 }, b: Rng = { z: 42 };
    const sa = [u(a), u(a), u(a)], sb = [u(b), u(b), u(b)];
    expect(sa).toEqual(sb);
  });

  it("u cae en [0, 1)", () => {
    const rng: Rng = { z: 7 };
    for (let i = 0; i < 1000; i++) {
      const x = u(rng);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("distribuciones derivadas (§3.6.2)", () => {
  it("uniforme respeta el rango del ruido de bajas", () => {
    const rng: Rng = { z: 99 };
    for (let i = 0; i < 500; i++) {
      const e = uniforme(rng, 0.8, 1.2);
      expect(e).toBeGreaterThanOrEqual(0.8);
      expect(e).toBeLessThan(1.2);
    }
  });

  it("uniformeDiscreta devuelve índices válidos", () => {
    const rng: Rng = { z: 3 };
    for (let i = 0; i < 500; i++) {
      const k = uniformeDiscreta(rng, 25);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(25);
    }
  });

  it("bernoulli(1) siempre ocurre y bernoulli(0) nunca", () => {
    const rng: Rng = { z: 11 };
    expect(bernoulli(rng, 1)).toBe(true);
    expect(bernoulli(rng, 0)).toBe(false);
  });

  it("empirica devuelve el menor índice cuya acumulada supera a U", () => {
    // Tabla del §3.6.3: 0,30 / 0,55 / 0,80 / 1,00
    const acum = [0.3, 0.55, 0.8, 1.0];
    const rng: Rng = { z: 5 };
    const conteo = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) conteo[empirica(rng, acum)]++;
    expect(conteo.every((c) => c > 0)).toBe(true);
    expect(conteo[0]).toBeGreaterThan(conteo[3]); // p=0,30 vs p=0,20
  });
});
