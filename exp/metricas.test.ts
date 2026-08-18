import { describe, it, expect } from "vitest";
import { resumirCelda, T_CRITICO_29 } from "./metricas";
import type { Corrida } from "./tipos";

const c = (tVic: number, over: Partial<Corrida> = {}): Corrida => ({
  nJugadores: 5, gamma: 0.1, semilla: 1000, tVic,
  ganador: 0, motivo: "puntuacion", colapsados: 0, llegaronA40: 0,
  ...over,
});

describe("métricas de salida (ecs. 3.34-3.37)", () => {
  it("la media y la varianza muestral son las de la ec. 3.34", () => {
    // Para [10, 20, 30]: media 20; s² = ((100)+(0)+(100))/2 = 100
    const r = resumirCelda([c(10), c(20), c(30)]);
    expect(r.mediaTVic).toBeCloseTo(20, 10);
    expect(r.varianzaTVic).toBeCloseTo(100, 10);   // divisor R−1, no R
  });

  it("el intervalo de la ec. 3.35 se centra en la media y usa t(R−1)", () => {
    const r = resumirCelda([c(10), c(20), c(30)]);
    const semi = T_CRITICO_29 * Math.sqrt(100) / Math.sqrt(3);
    expect(r.ic95[0]).toBeCloseTo(20 - semi, 8);
    expect(r.ic95[1]).toBeCloseTo(20 + semi, 8);
  });

  it("con una sola réplica la varianza es 0 y el intervalo degenera", () => {
    const r = resumirCelda([c(50)]);
    expect(r.varianzaTVic).toBe(0);
    expect(r.ic95).toEqual([50, 50]);
  });

  it("la tasa de colapso es el cociente de la ec. 3.37, no un promedio de cocientes", () => {
    // 2 colapsos sobre 5 que llegaron al 40 %, repartidos desigual entre réplicas
    const r = resumirCelda([
      c(100, { colapsados: 2, llegaronA40: 4 }),
      c(100, { colapsados: 0, llegaronA40: 1 }),
    ]);
    expect(r.tasaColapso).toBeCloseTo(2 / 5, 10);   // no (2/4 + 0/1)/2 = 0,25
  });

  it("sin nadie que llegue al 40 %, la tasa es null y no 0", () => {
    const r = resumirCelda([c(100), c(100)]);
    expect(r.tasaColapso).toBeNull();
  });

  it("reporta la fracción de corridas por horizonte (§5.3)", () => {
    const r = resumirCelda([
      c(300, { motivo: "horizonte" }),
      c(120, { motivo: "puntuacion" }),
      c(80, { motivo: "dominacion" }),
      c(300, { motivo: "horizonte" }),
    ]);
    expect(r.fraccionHorizonte).toBeCloseTo(0.5, 10);
  });
});
