import { describe, it, expect } from "vitest";
import { TECNOLOGIAS } from "./tecnologias";
import { MEJORAS, COSTO_MEJORA, COSTO_CASTILLO } from "./mejoras";

describe("catálogos (§4.2 y §4.3 del spec)", () => {
  it("hay 6 tecnologías — el |T| de la ec. 3.33", () => {
    expect(Object.keys(TECNOLOGIAS)).toHaveLength(6);
  });

  it("los prerrequisitos existen y no son cíclicos", () => {
    for (const [id, tec] of Object.entries(TECNOLOGIAS))
      for (const pre of tec.prereq) {
        expect(TECNOLOGIAS).toHaveProperty(pre);
        expect(pre).not.toBe(id);
        expect(TECNOLOGIAS[pre].prereq).toHaveLength(0); // árbol de 2 niveles
      }
  });

  it("cada tecnología aporta a exactamente una rama", () => {
    for (const tec of Object.values(TECNOLOGIAS)) {
      const ramas = [tec.eEco, tec.eAtk, tec.eDef].filter((x) => x > 0);
      expect(ramas).toHaveLength(1);
    }
  });

  it("el tier 2 cuesta más y tarda más que el tier 1", () => {
    expect(TECNOLOGIAS.rutas.C).toBeGreaterThan(TECNOLOGIAS.arado.C);
    expect(TECNOLOGIAS.rutas.D).toBeGreaterThan(TECNOLOGIAS.arado.D);
  });

  it("hay 4 mejoras y sus μ_m caen en el rango [2, 8] del §2.4", () => {
    const ids = Object.keys(MEJORAS);
    expect(ids).toHaveLength(4);
    for (const m of Object.values(MEJORAS)) {
      expect(m.mu).toBeGreaterThanOrEqual(2);
      expect(m.mu).toBeLessThanOrEqual(8);
    }
  });

  it("las constantes que DecidirIA usaba sin declarar existen", () => {
    expect(COSTO_MEJORA).toBe(MEJORAS.mercado.costo);
    expect(COSTO_CASTILLO).toBe(MEJORAS.castillo.costo);
  });
});
