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

  it("consume el mismo número del generador aunque una guarda plausible falle", () => {
    // Regresión objetivo: un `if (!enGuerra(...)) return;` ANTES del sorteo.
    // Comparar dos escenarios ambos en guerra no lo detectaría, así que se
    // despacha la propuesta en los tres escenarios —guerra, sin guerra y con
    // un jugador inactivo— y se exige que el generador quede EN EL MISMO punto.
    const despachar = (prep: (st: ReturnType<typeof crearPartida>) => void) => {
      const st = crearPartida(configPorDefecto({ nJugadores: 3, semilla: 7 }));
      prep(st);
      insertar(st.lef, st.t, PRIO.ACTIVIDAD, "PROPUESTA_ACUERDO",
               { de: 0, a: 1, tipo: "tregua" });
      pasoEvento(st);
      return st.rng.z;
    };
    const intacto = crearPartida(configPorDefecto({ nJugadores: 3, semilla: 7 })).rng.z;

    const conGuerra = despachar((st) => declararGuerra(st, 0, 1));
    const sinGuerra = despachar(() => {});                       // R = 0: no hay guerra
    const inactivo  = despachar((st) => { st.jugadores[1].activo = false; });

    expect(conGuerra).not.toBe(intacto);      // el sorteo ocurrió
    expect(sinGuerra).toBe(conGuerra);        // y ocurre igual sin guerra
    expect(inactivo).toBe(conGuerra);         // y con un jugador inactivo
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

describe("eliminación de un jugador (§5.1)", () => {
  it("retira ejércitos, acuerdos y su fila/columna de R, y anula sus conquistas", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    const j = st.jugadores[1];

    // Un objetivo neutral y el ejército del jugador 1 al lado, con una
    // conquista ya encolada; el jugador se queda sin territorio este turno.
    const objetivo = st.provincias.find((p) => p.c === -1)!;
    const k = [...st.ejercitos.values()].find((e) => e.jugador === j.id)!;
    for (const p of st.provincias) if (p.c === j.id) p.c = -1;

    st.acuerdos.push({ tipo: "tregua", entre: [0, 1], delta: 5 });
    st.relaciones[0][1] = st.relaciones[1][0] = st.params.rGuerra;
    insertar(st.lef, st.t, PRIO.FIN_TURNO, "FIN_TURNO", {});
    pasoEvento(st);                                   // FIN_TURNO → lo elimina

    expect(j.activo).toBe(false);
    expect(st.ejercitos.get(k.id)?.vivo ?? false).toBe(false);
    expect([...st.ejercitos.values()].some((e) => e.vivo && e.jugador === j.id)).toBe(false);
    expect(st.acuerdos).toHaveLength(0);
    expect(st.relaciones[0][1]).toBe(0);
    expect(st.relaciones[1][0]).toBe(0);
    expect(st.relaciones[1][2]).toBe(0);
    expect(st.relaciones[2][1]).toBe(0);

    // La conquista encolada se descarta aunque el ejército siguiera en pie:
    // el campo `jugador` de CONQUISTA_PROVINCIA es lo que la invalida.
    st.ejercitos.get(k.id)!.vivo = true;
    insertar(st.lef, st.t, PRIO.CONQUISTA, "CONQUISTA_PROVINCIA",
             { atacante: k.id, provincia: objetivo.id, jugador: j.id });
    const e = pasoEvento(st);
    expect(e!.tipo).toBe("CONQUISTA_PROVINCIA");
    expect(objetivo.c).toBe(-1);                      // no cambió de dueño
    expect(j.activo).toBe(false);
  });
});

describe("ec. 3.30 — R se actualiza una vez por PAR y por turno", () => {
  it("un turno mueve R exactamente lo que predice una sola aplicación", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.relaciones[0][1] = st.relaciones[1][0] = 50;

    // fronterasCompartidas(0, 1), congelado antes del turno: el FIN_TURNO
    // aislado no cambia dueños.
    let f = 0;
    for (const p of st.provincias)
      if (p.c === 0) for (const v of p.vecinos) if (st.provincias[v].c === 1) f++;

    const esperado = Math.max(-100, Math.min(100,
      50 + st.params.nu * (0 - 50) - st.params.zeta * f));

    insertar(st.lef, st.t, PRIO.FIN_TURNO, "FIN_TURNO", {});
    pasoEvento(st);

    expect(st.relaciones[0][1]).toBeCloseTo(esperado, 10);
    expect(st.relaciones[1][0]).toBeCloseTo(esperado, 10);
  });

  it("δ_a decrece un turno por turno, no una vez por jugador", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.acuerdos.push({ tipo: "tregua", entre: [0, 1], delta: 10 });
    insertar(st.lef, st.t, PRIO.FIN_TURNO, "FIN_TURNO", {});
    pasoEvento(st);
    expect(st.acuerdos[0].delta).toBe(9);
  });
});

describe("aritmética entera y sorteos del §3.6", () => {
  it("E queda entero tras cada FIN_TURNO (§5.3)", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (let i = 0; i < 5; i++) pasoTurno(st);
    for (const j of st.jugadores) expect(Number.isInteger(j.E)).toBe(true);
  });

  it("la invasión bárbara sortea el objetivo entre los activos (§3.6.3)", () => {
    // La fuerza de cada jugador es distinta, así que el tamaño del bárbaro
    // —perdida(0,1·S_objetivo)— identifica a quién se le apuntó.
    const objetivos = new Set<number>();
    // Las semillas se espacian: el LCG arranca casi lineal en z y semillas
    // consecutivas nunca alcanzan el cuarto tramo de la empírica (U > 0,8).
    for (let k = 1; k <= 500 && objetivos.size < 2; k++) {
      const st = crearPartida(configPorDefecto({ nJugadores: 3, semilla: k * 100_003 }));
      for (const e of st.ejercitos.values())
        if (e.jugador >= 0) e.S = 1000 * (e.jugador + 1);
      const antes = st.proximoEjercitoId;
      insertar(st.lef, st.t, PRIO.EVENTO_ALEATORIO, "EVENTO_ALEATORIO", {});
      pasoEvento(st);
      if (st.proximoEjercitoId === antes) continue;   // salió otro evento global
      objetivos.add(st.ejercitos.get(antes)!.S / 100 - 1);
    }
    expect(objetivos.size).toBeGreaterThan(1);
  });
});
