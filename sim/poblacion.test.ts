import { describe, it, expect } from "vitest";
import { etaPob, crecer } from "./poblacion";
import { PARAMS } from "./datos/parametros";
import { crearPartida, configPorDefecto } from "./inicial";
import { pasoTurno } from "./motor";
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
    crecer(lejos, PARAMS);
    crecer(cerca, PARAMS);
    expect(lejos.Pob - 1_000).toBeGreaterThan(cerca.Pob - 9_500);
  });

  it("nunca supera K", () => {
    const lleno = prov({ Pob: 10_000 });
    crecer(lleno, PARAMS);
    expect(lleno.Pob).toBeLessThanOrEqual(10_000);
  });

  it("bajo asedio el crecimiento se detiene", () => {
    const p = prov({ estado: "asediada" });
    crecer(p, PARAMS);
    expect(p.Pob).toBe(5_000);
  });

  it("la escasez revierte el crecimiento (bucle B2), aplicada por finTurno paso 4", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[0];
    j.F = 0;
    for (const p of st.provincias) if (p.c === j.id) p.a = 0;   // sin producción: fuerza s_j > 0

    const provId = st.provincias.find((p) => p.c === j.id)!.id;
    const antes = st.provincias[provId].Pob;

    pasoTurno(st);

    expect(st.provincias[provId].c).toBe(j.id);   // sigue siendo suya: comparación válida
    expect(st.provincias[provId].Pob).toBeLessThan(antes);
  });
});
