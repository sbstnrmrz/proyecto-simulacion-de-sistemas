import { describe, it, expect } from "vitest";
import { PARAMS } from "./parametros";

describe("parámetros del §2.4", () => {
  it("copia los valores del documento", () => {
    expect(PARAMS.tau).toBe(0.02);
    expect(PARAMS.alpha).toBe(0.01);
    expect(PARAMS.sigma).toBe(0.05);
    expect(PARAMS.gamma).toBe(0.1);
    expect(PARAMS.kappa).toBe(0.6);
    expect(PARAMS.lambda).toBe(0.08);
    expect(PARAMS.tMax).toBe(300);
    expect(PARAMS.thetaV).toBe(70);
  });

  it("omegaD es magnitud positiva (errata §5.2 del spec)", () => {
    // El §2.4 lo tabula como −20, pero el pseudocódigo escribe `- omega_D`.
    // Con −20, perder subiría la moral y el bucle R3 no existiría.
    expect(PARAMS.omegaD).toBe(20);
    expect(PARAMS.omegaV).toBe(10);
  });

  it("los pesos de la puntuación suman 1 (ec. 3.33)", () => {
    expect(PARAMS.wP + PARAMS.wH + PARAMS.wS + PARAMS.wT).toBeCloseTo(1, 10);
  });

  it("los pesos de la utilidad de la IA suman 1 (ec. 4.4)", () => {
    expect(PARAMS.w1 + PARAMS.w2 + PARAMS.w3 + PARAMS.w4).toBeCloseTo(1, 10);
  });

  it("la histéresis de lealtad tiene banda muerta (§5.2)", () => {
    expect(PARAMS.lambdaCrit).toBeLessThan(PARAMS.lambdaRec);
  });
});
