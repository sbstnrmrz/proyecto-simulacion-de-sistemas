import { describe, it, expect } from "vitest";
import { graficoTerritorio, COLORES_JUGADOR } from "./grafico";

describe("gráfico territorial (§6)", () => {
  it("devuelve un SVG con una polilínea por jugador", () => {
    const svg = graficoTerritorio([[0.1, 0.2, 0.3], [0.4, 0.4, 0.2]]);
    expect(svg).toContain("<svg");
    expect(svg.match(/<polyline/g)).toHaveLength(2);
  });

  it("marca los umbrales de la ec. 3.36 (40 % y 20 %)", () => {
    // Son los que definen el colapso: verlos es el punto del gráfico.
    const svg = graficoTerritorio([[0.5, 0.1]]);
    expect(svg).toContain("40");
    expect(svg).toContain("20");
  });

  it("no rompe con series vacías ni con un solo punto", () => {
    expect(graficoTerritorio([])).toContain("<svg");
    expect(graficoTerritorio([[0.3]])).toContain("<svg");
  });

  it("asigna un color distinto a cada jugador", () => {
    expect(new Set(COLORES_JUGADOR).size).toBe(COLORES_JUGADOR.length);
    expect(COLORES_JUGADOR.length).toBeGreaterThanOrEqual(8);
  });

  it("escala al máximo de la serie, no a 1, cuando nadie se acerca al 100 %", () => {
    // Si escalara siempre a 1, con fracciones de 0,05 el gráfico sería una línea plana.
    const chico = graficoTerritorio([[0.02, 0.05]]);
    const grande = graficoTerritorio([[0.2, 0.5]]);
    expect(chico).not.toBe(grande);
  });
});
