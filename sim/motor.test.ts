import { describe, it, expect } from "vitest";
import { pasoEvento, pasoTurno, correr } from "./motor";
import { crearPartida, configPorDefecto } from "./inicial";
import { insertar, P as PRIO } from "./lef";
import { declararGuerra, enGuerra } from "./diplomacia";

describe("dispatcher (§4.2)", () => {
  it("el reloj sólo avanza hacia adelante", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    let previo = -1;
    for (let i = 0; i < 300; i++) {
      const e = pasoEvento(st);
      if (!e) break;
      expect(e.t).toBeGreaterThanOrEqual(previo);
      previo = e.t;
    }
  });

  it("INICIO_TURNO encola decisiones y FIN_TURNO (§4.2)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    pasoEvento(st);   // consume el INICIO_TURNO
    const tipos = st.lef.heap.map((e) => e.tipo);
    expect(tipos.filter((t) => t === "DECISION_JUGADOR")).toHaveLength(3);
    expect(tipos).toContain("FIN_TURNO");
  });

  it("un turno completo deja el estado en dominios válidos (§2.1)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    pasoTurno(st);
    for (const j of st.jugadores) {
      expect(j.E).toBeGreaterThanOrEqual(0);
      expect(j.F).toBeGreaterThanOrEqual(0);
      expect(j.RD).toBeGreaterThanOrEqual(0);
    }
    for (const p of st.provincias) {
      expect(p.Pob).toBeGreaterThanOrEqual(0);
      expect(p.Pob).toBeLessThanOrEqual(p.K);
      expect(p.lealtad).toBeGreaterThanOrEqual(0);
      expect(p.lealtad).toBeLessThanOrEqual(100);
    }
  });

  it("registra las series turno a turno (ecs. 3.36-3.37)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    pasoTurno(st); pasoTurno(st);
    expect(st.series.nFrac[0]).toHaveLength(2);
    expect(st.series.nFrac[0][0]).toBeGreaterThan(0);
  });
});

describe("despacho de acuerdos (§3.6.2 y §3.8)", () => {
  it("PROPUESTA_ACUERDO programa la ratificación en {1..kmax} turnos", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    declararGuerra(st, 0, 1);
    insertar(st.lef, st.t, PRIO.ACTIVIDAD, "PROPUESTA_ACUERDO",
             { de: 0, a: 1, tipo: "tregua" });
    pasoEvento(st);
    const rat = st.lef.heap.filter((e) => e.tipo === "ACUERDO_RATIFICADO");
    expect(rat).toHaveLength(1);
    expect(rat[0].p).toBe(PRIO.COMPLETADO);
    expect(rat[0].t - st.t).toBeGreaterThanOrEqual(1);
    expect(rat[0].t - st.t).toBeLessThanOrEqual(st.params.kmaxNegociacion);
    expect(rat[0].datos).toEqual({ de: 0, a: 1, tipo: "tregua" });
  });

  it("ACUERDO_RATIFICADO libera R de −100 (ec. 3.30) y registra el acuerdo", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    declararGuerra(st, 0, 1);
    expect(enGuerra(st, 0, 1)).toBe(true);
    insertar(st.lef, st.t, PRIO.COMPLETADO, "ACUERDO_RATIFICADO",
             { de: 0, a: 1, tipo: "tregua" });
    pasoEvento(st);
    expect(st.relaciones[0][1]).toBe(0);
    expect(st.relaciones[1][0]).toBe(0);
    expect(enGuerra(st, 0, 1)).toBe(false);
    expect(st.acuerdos).toEqual([
      { tipo: "tregua", entre: [0, 1], delta: st.params.duracionTregua },
    ]);
  });

  it("descarta la ratificación si ya no hay guerra o alguien no está activo", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    insertar(st.lef, st.t, PRIO.COMPLETADO, "ACUERDO_RATIFICADO",
             { de: 0, a: 1, tipo: "tregua" });   // nunca estuvieron en guerra
    pasoEvento(st);
    expect(st.acuerdos).toHaveLength(0);

    declararGuerra(st, 0, 2);
    st.jugadores[2].activo = false;
    insertar(st.lef, st.t, PRIO.COMPLETADO, "ACUERDO_RATIFICADO",
             { de: 0, a: 2, tipo: "tregua" });
    pasoEvento(st);
    expect(st.acuerdos).toHaveLength(0);
    expect(st.relaciones[0][2]).toBe(st.params.rGuerra);
  });

  it("la propuesta consume siempre un número del generador", () => {
    const mk = () => {
      const st = crearPartida(configPorDefecto({ nJugadores: 3, semilla: 7 }));
      declararGuerra(st, 0, 1);
      return st;
    };
    const conPropuesta = mk();
    insertar(conPropuesta.lef, conPropuesta.t, PRIO.ACTIVIDAD, "PROPUESTA_ACUERDO",
             { de: 0, a: 1, tipo: "tregua" });
    pasoEvento(conPropuesta);
    const sinPropuesta = mk();
    expect(conPropuesta.rng.z).not.toBe(sinPropuesta.rng.z);
  });
});

describe("provincia conquistada con un enemigo adentro (ec. 5.2)", () => {
  it("queda asediada, no normal", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));

    // Provincia del jugador 1 con DOS defensores: resolverBatalla sólo pelea
    // contra el primero (DefensorEn, §4.4), así que el segundo sobrevive.
    const prov = st.provincias.find((p) => p.c === 1)!;
    for (const [id, e] of st.ejercitos) if (e.u === prov.id) st.ejercitos.delete(id);

    for (let i = 0; i < 2; i++) {
      const id = st.proximoEjercitoId++;
      st.ejercitos.set(id, {
        id, jugador: 1, S: 10, M: 100, X: 0, u: prov.id,
        combatioEsteTurno: false, vivo: true,
      });
    }
    const atacanteId = st.proximoEjercitoId++;
    st.ejercitos.set(atacanteId, {
      id: atacanteId, jugador: 0, S: 5000, M: 100, X: 0, u: prov.vecinos[0],
      combatioEsteTurno: false, vivo: true,
    });
    declararGuerra(st, 0, 1);

    insertar(st.lef, st.t, PRIO.BATALLA, "BATALLA",
             { atacante: atacanteId, provincia: prov.id, origen: prov.vecinos[0] });
    pasoEvento(st);   // BATALLA
    pasoEvento(st);   // CONQUISTA_PROVINCIA

    expect(prov.c).toBe(0);
    const enemigosDentro = [...st.ejercitos.values()].filter(
      (e) => e.vivo && e.S > 0 && e.u === prov.id && e.jugador !== 0);
    expect(enemigosDentro.length).toBeGreaterThan(0);

    pasoTurno(st);
    expect(prov.estado).toBe("asediada");
    expect(prov.estado).not.toBe("normal");
  });
});

describe("correr() — partida completa", () => {
  it("siempre termina y nunca pasa Tmax (§5.3)", () => {
    const r = correr(crearPartida(configPorDefecto({ semilla: 1, nJugadores: 3 })));
    expect(r.tVic).toBeLessThanOrEqual(300);
    expect(["dominacion", "puntuacion", "horizonte"]).toContain(r.motivo);
  });

  it("devuelve el diagnóstico de colapso por jugador (ecs. 3.36-3.37)", () => {
    const r = correr(crearPartida(configPorDefecto({ semilla: 2, nJugadores: 5 })));
    expect(r.colapsos).toHaveLength(5);
    for (const c of r.colapsos) {
      expect(typeof c.llegoA40).toBe("boolean");
      if (c.colapso) expect(c.llegoA40).toBe(true);   // colapso implica haber sido grande
    }
  });

  it("es reproducible con la misma semilla", () => {
    const a = correr(crearPartida(configPorDefecto({ semilla: 99, nJugadores: 5 })));
    const b = correr(crearPartida(configPorDefecto({ semilla: 99, nJugadores: 5 })));
    expect(a).toEqual(b);
  });

  it("dos partidas intercaladas no se contaminan entre sí", () => {
    const solo = correr(crearPartida(configPorDefecto({ semilla: 55, nJugadores: 3 })));
    const x = crearPartida(configPorDefecto({ semilla: 55, nJugadores: 3 }));
    const y = crearPartida(configPorDefecto({ semilla: 77, nJugadores: 3 }));
    for (let i = 0; i < 50; i++) { pasoTurno(x); pasoTurno(y); }
    const juntas = correr(x);
    expect(juntas).toEqual(solo);
  });
});
