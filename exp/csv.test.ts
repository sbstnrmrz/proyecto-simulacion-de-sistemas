import { describe, it, expect } from "vitest";
import { aCSV } from "./csv";
import type { Corrida } from "./tipos";

const corrida = (over: Partial<Corrida> = {}): Corrida => ({
  nJugadores: 5, gamma: 0.1, semilla: 1000,
  tVic: 120, ganador: 2, motivo: "puntuacion",
  colapsados: 1, llegaronA40: 3,
  ...over,
});

describe("exportación CSV (§7)", () => {
  it("emite encabezado y una fila por corrida", () => {
    const csv = aCSV([corrida(), corrida({ semilla: 1001 })]);
    const lineas = csv.trim().split("\n");
    expect(lineas).toHaveLength(3);            // encabezado + 2
    expect(lineas[0]).toBe("nJugadores,gamma,semilla,tVic,ganador,motivo,colapsados,llegaronA40");
  });

  it("usa punto decimal, no coma, para que otras herramientas lo lean", () => {
    const csv = aCSV([corrida({ gamma: 0.05 })]);
    expect(csv).toContain("0.05");
    expect(csv.split("\n")[1].split(",")).toHaveLength(8);
  });

  it("no rompe con una lista vacía", () => {
    expect(aCSV([]).trim().split("\n")).toHaveLength(1);   // sólo encabezado
  });
});
