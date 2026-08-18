import { describe, it, expect } from "vitest";
import { u, uniforme, uniformeDiscreta, bernoulli, empirica, normal, type Rng } from "./rng";

describe("GCL (§3.6.1 del modelo)", () => {
  it("reproduce a mano la primera iteración con Z0 = 1", () => {
    // Z1 = (1 664 525·1 + 1 013 904 223) mod 2^32 = 1 015 568 748
    const rng: Rng = { z: 1 };
    u(rng);
    expect(rng.z).toBe(1_015_568_748);
  });

  it("la multiplicación es exacta en doubles para el peor caso", () => {
    // 1 664 525 × (2^32 − 1) ≈ 7,149e15 < 2^53 ≈ 9,007e15: ninguna iteración
    // del GCL real pierde precisión al pasar por un `z` intermedio grande.
    const rng: Rng = { z: 2 ** 32 - 1 };
    for (let i = 0; i < 10_000; i++) {
      u(rng);
      expect(Number.isSafeInteger(rng.z)).toBe(true);
      expect(rng.z).toBeGreaterThanOrEqual(0);
      expect(rng.z).toBeLessThan(2 ** 32);
    }
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

describe("normal (Box-Muller, §3.6.2)", () => {
  it("reproduce a mano el primer valor con Z0 = 1", () => {
    // u1 = Z1/2^32 = 0,23645552527159452 (Z1 de la tabla del §3.6.1)
    // u2 = Z2/2^32 = 0,3692706737201661
    // normal = sqrt(-2·ln(u1))·cos(2π·u2)·sigma, sigma = 2
    const rng: Rng = { z: 1 };
    expect(normal(rng, 2)).toBeCloseTo(-2.3136687068899575, 10);
  });

  it("es determinista: misma semilla, misma secuencia", () => {
    const a: Rng = { z: 42 }, b: Rng = { z: 42 };
    const sa = [normal(a, 1), normal(a, 1), normal(a, 1)];
    const sb = [normal(b, 1), normal(b, 1), normal(b, 1)];
    expect(sa).toEqual(sb);
  });

  it("la media empírica se acerca a 0 y la desviación escala con sigma", () => {
    const media = (seed: number, sigma: number, n: number): { media: number; sd: number } => {
      const rng: Rng = { z: seed };
      let suma = 0, sumaCuad = 0;
      for (let i = 0; i < n; i++) {
        const x = normal(rng, sigma);
        suma += x;
        sumaCuad += x * x;
      }
      const m = suma / n;
      return { media: m, sd: Math.sqrt(sumaCuad / n - m * m) };
    };

    // n=5000, semilla=17: media ≈ 0,0005, sd ≈ 1,0089 (sigma=1).
    const uno = media(17, 1, 5000);
    expect(Math.abs(uno.media)).toBeLessThan(0.1);
    expect(uno.sd).toBeGreaterThan(0.9);
    expect(uno.sd).toBeLessThan(1.1);

    // La dispersión debe escalar linealmente con sigma: comparamos
    // sigma=0,05 (sd ≈ 0,0504) contra sigma=0,5 (sd ≈ 0,5044), razón ≈ 10.
    // Un error de signo o de ángulo en Box–Muller no cambiaría esta razón,
    // pero un error en el factor sigma sí, así que esto lo detecta.
    const chica = media(17, 0.05, 5000);
    const grande = media(17, 0.5, 5000);
    expect(chica.sd).toBeGreaterThan(0.03);
    expect(chica.sd).toBeLessThan(0.07);
    expect(grande.sd).toBeGreaterThan(0.3);
    expect(grande.sd).toBeLessThan(0.7);
    const razon = grande.sd / chica.sd;
    expect(razon).toBeGreaterThan(9);
    expect(razon).toBeLessThan(11);
  });
});
