import { describe, it, expect } from "vitest";
import { etaPob, crecer } from "./poblacion";
import { PARAMS } from "./datos/parametros";
import type { Provincia } from "./tipos";

const prov = (over: Partial<Provincia> = {}): Provincia => ({
  id: 0, nombre: "X", vecinos: [], K: 10_000, a: 30, D: 10, aE: 1,
  Pob: 5_000, c: 0, lealtad: 70, estado: "normal",
  mejoras: [], turnosDespoblada: 0, ...over,
});

describe("población (ecs. 3.1–3.2)", () => {
  it("eta_pob vale 1 / 0 / 0,5 según el estado", () => {
    expect(etaPob("normal")).toBe(1);
    expect(etaPob("asediada")).toBe(0);
    expect(etaPob("rebelde")).toBe(0.5);
  });

  it("crece logísticamente y frena cerca de la capacidad de carga", () => {
    const lejos = prov({ Pob: 1_000 });
    const cerca = prov({ Pob: 9_500 });
    crecer(lejos, PARAMS, 0, 0);
    crecer(cerca, PARAMS, 0, 0);
    expect(lejos.Pob - 1_000).toBeGreaterThan(cerca.Pob - 9_500);
  });

  it("nunca supera K ni baja de 0", () => {
    const lleno = prov({ Pob: 10_000 });
    crecer(lleno, PARAMS, 0, 0);
    expect(lleno.Pob).toBeLessThanOrEqual(10_000);

    const arrasada = prov({ Pob: 100 });
    crecer(arrasada, PARAMS, 1, 1);   // hambruna total + peste
    expect(arrasada.Pob).toBe(0);
  });

  it("bajo asedio el crecimiento se detiene", () => {
    const p = prov({ estado: "asediada" });
    crecer(p, PARAMS, 0, 0);
    expect(p.Pob).toBe(5_000);
  });

  it("la escasez revierte el crecimiento (bucle B2)", () => {
    const p = prov();
    crecer(p, PARAMS, 1, 0);   // s_j = 1 → pérdida φ·1 = 50 %
    expect(p.Pob).toBeLessThan(5_000);
  });
});
