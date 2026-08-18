import { describe, it, expect } from "vitest";
import { crearLEF, insertar, extraerMin, vacia, P } from "./lef";

describe("LEF (§4.1 del modelo)", () => {
  it("extrae por turno, luego por prioridad", () => {
    const lef = crearLEF();
    insertar(lef, 2, P.INICIO_TURNO, "INICIO_TURNO", {});
    insertar(lef, 1, P.FIN_TURNO, "FIN_TURNO", {});
    insertar(lef, 1, P.BATALLA, "BATALLA", {});
    expect(extraerMin(lef)!.tipo).toBe("BATALLA");      // t=1, p=5
    expect(extraerMin(lef)!.tipo).toBe("FIN_TURNO");    // t=1, p=8
    expect(extraerMin(lef)!.tipo).toBe("INICIO_TURNO"); // t=2
  });

  it("desempata FIFO dentro de (t, p) — es lo que hace determinista la sim", () => {
    const lef = crearLEF();
    insertar(lef, 1, P.DECISION_JUGADOR, "DECISION_JUGADOR", { jugador: 0 });
    insertar(lef, 1, P.DECISION_JUGADOR, "DECISION_JUGADOR", { jugador: 1 });
    insertar(lef, 1, P.DECISION_JUGADOR, "DECISION_JUGADOR", { jugador: 2 });
    expect(extraerMin(lef)!.datos.jugador).toBe(0);
    expect(extraerMin(lef)!.datos.jugador).toBe(1);
    expect(extraerMin(lef)!.datos.jugador).toBe(2);
  });

  it("reproduce el orden 3-4-5 del ejemplo del §4.1", () => {
    const lef = crearLEF();
    insertar(lef, 1, P.BATALLA, "BATALLA", {});
    insertar(lef, 1, P.ACTIVIDAD, "INICIO_MOVIMIENTO", {});
    insertar(lef, 1, P.LLEGADA_DESTINO, "LLEGADA_DESTINO", {});
    expect(extraerMin(lef)!.tipo).toBe("INICIO_MOVIMIENTO");
    expect(extraerMin(lef)!.tipo).toBe("LLEGADA_DESTINO");
    expect(extraerMin(lef)!.tipo).toBe("BATALLA");
  });

  it("cada LEF tiene su propio contador sec", () => {
    // Si sec fuera de módulo, las 270 corridas del §7 no serían reproducibles.
    const a = crearLEF(), b = crearLEF();
    insertar(a, 1, 0, "INICIO_TURNO", {});
    insertar(b, 1, 0, "INICIO_TURNO", {});
    expect(extraerMin(a)!.sec).toBe(extraerMin(b)!.sec);
  });

  it("vacia() y extraerMin() sobre cola vacía", () => {
    const lef = crearLEF();
    expect(vacia(lef)).toBe(true);
    expect(extraerMin(lef)).toBeNull();
  });

  it("mantiene el orden con muchos elementos", () => {
    const lef = crearLEF();
    for (let i = 100; i > 0; i--) insertar(lef, i, 0, "INICIO_TURNO", {});
    const ts: number[] = [];
    while (!vacia(lef)) ts.push(extraerMin(lef)!.t);
    expect(ts).toEqual([...ts].sort((x, y) => x - y));
  });
});
