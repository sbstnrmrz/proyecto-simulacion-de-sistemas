import { describe, it, expect } from "vitest";
import { calcularPuntuacion, evaluarVictoria } from "./puntuacion";
import { crearPartida, configPorDefecto } from "./inicial";

describe("puntuación (ec. 3.33)", () => {
  it("un jugador que tiene todo saca 100", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (const p of st.provincias) p.c = 0;
    for (const e of [...st.ejercitos.values()]) if (e.jugador !== 0) e.vivo = false;
    for (const id of ["arado", "rutas", "herreria", "asedio", "muralla_seca", "fortificacion"] as const)
      st.jugadores[0].tecnologias.add(id);
    expect(calcularPuntuacion(st, st.jugadores[0])).toBeCloseTo(100, 6);
  });

  it("los tres términos exclusivos (nⱼ/N, Pobⱼ/Pob_tot, Sⱼ/S_tot) particionan: su suma no supera 100·(wP+wH+wS)", () => {
    // provincias, población y ejércitos son recursos exclusivos: cada uno
    // pertenece a lo sumo a un jugador, así que estos tres cocientes SÍ
    // particionan entre jugadores activos. |Tⱼ|/|T| no lo hace (ver el
    // siguiente test), así que aquí dejamos a todos sin tecnología para
    // aislar únicamente los términos exclusivos.
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (let i = 0; i < st.provincias.length; i++) st.provincias[i].c = i % 3;
    const cota = 100 * (st.params.wP + st.params.wH + st.params.wS);
    const total = st.jugadores.reduce((s, j) => s + calcularPuntuacion(st, j), 0);
    expect(total).toBeLessThanOrEqual(cota + 0.0001);
  });

  it("DEFECTO CONOCIDO DEL DOCUMENTO (no del código): Σⱼ Vⱼ puede superar 100", () => {
    // El documento (§3.9) afirma Σⱼ Vⱼ ≤ 100 en todo momento, pero eso es
    // falso: |Tⱼ|/|T| en la ec. 3.33 NO es un recurso exclusivo — cada
    // jugador investiga por su cuenta y todos pueden alcanzar las 6
    // tecnologías simultáneamente. calcularPuntuacion transcribe la ec. 3.33
    // fielmente; este test fija el comportamiento real (la suma puede
    // exceder 100), no lo que el documento afirma que debería pasar.
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (let i = 0; i < st.provincias.length; i++) st.provincias[i].c = i % 3;
    for (const j of st.jugadores)
      for (const id of ["arado", "rutas", "herreria", "asedio", "muralla_seca", "fortificacion"] as const)
        j.tecnologias.add(id);
    const total = st.jugadores.reduce((s, j) => s + calcularPuntuacion(st, j), 0);
    expect(total).toBeGreaterThan(100);
  });
});

describe("condiciones de victoria (§3.9)", () => {
  it("dominación: queda un solo jugador", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.jugadores[1].activo = false;
    st.jugadores[2].activo = false;
    evaluarVictoria(st);
    expect(st.fin).not.toBeNull();
    expect(st.fin!.motivo).toBe("dominacion");
    expect(st.fin!.ganador).toBe(0);
  });

  it("puntuación: alguien supera θ_V", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    for (const p of st.provincias) if (p.c === -1) p.c = 0;
    evaluarVictoria(st);
    expect(st.fin!.motivo).toBe("puntuacion");
  });

  it("horizonte: en t = Tmax gana el de mayor V, desempate por menor id", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.t = st.params.tMax;
    evaluarVictoria(st);
    expect(st.fin!.motivo).toBe("horizonte");
    expect(st.fin!.ganador).toBe(0);      // empate exacto → menor id
  });

  it("sin condición cumplida no termina", () => {
    const st = crearPartida(configPorDefecto({ nJugadores: 3 }));
    st.t = 5;
    evaluarVictoria(st);
    expect(st.fin).toBeNull();
  });
});
