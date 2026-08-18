import { describe, it, expect } from "vitest";
import { clamp, perdida, ganancia } from "./redondeo";

describe("redondeo (§5.3 del modelo)", () => {
  it("clamp satura en ambos extremos", () => {
    expect(clamp(5, 0, 100)).toBe(5);
    expect(clamp(-3, 0, 100)).toBe(0);
    expect(clamp(140, 0, 100)).toBe(100);
  });

  it("las pérdidas redondean hacia arriba y las ganancias hacia abajo", () => {
    expect(perdida(2.1)).toBe(3);
    expect(ganancia(2.9)).toBe(2);
  });

  it("el criterio conservador nunca favorece al jugador", () => {
    // Una pérdida de 0.4 igual cuesta 1; una ganancia de 0.9 no da nada.
    expect(perdida(0.4)).toBe(1);
    expect(ganancia(0.9)).toBe(0);
  });
});
