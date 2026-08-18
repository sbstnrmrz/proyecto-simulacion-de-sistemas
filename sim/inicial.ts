import { crearLEF, insertar, P } from "./lef";
import { MAPA25, CAPITALES } from "./datos/mapa";
import { PARAMS } from "./datos/parametros";
import { perdida, ganancia } from "./redondeo";
import type { Config, Estado, Jugador, Provincia, Ejercito } from "./tipos";

export function configPorDefecto(over: Partial<Config> = {}): Config {
  return {
    semilla: 12_345,
    nJugadores: 5,
    mapa: "reticula25",
    params: { ...PARAMS },
    ...over,
  };
}

export function crearPartida(cfg: Config): Estado {
  const caps = CAPITALES[cfg.nJugadores];
  if (!caps) throw new Error(`sin capitales definidas para ${cfg.nJugadores} jugadores`);

  // El mapa se CLONA: a_i^E muta durante la corrida (§5.4 del spec) y no puede
  // compartirse entre réplicas del batch.
  const provincias: Provincia[] = MAPA25.map((d) => ({
    id: d.id, nombre: d.nombre, vecinos: [...d.vecinos],
    K: d.K, a: d.a, D: d.D, aE: d.aE,
    Pob: 0, c: -1, lealtad: 0,
    estado: "normal", mejoras: [], turnosDespoblada: 0,
  }));

  const jugadores: Jugador[] = caps.map((_, id) => ({
    id, activo: true,
    E: 500, F: 300, RD: 0,
    tecnologias: new Set(), investigando: null,
    betaEco: 0, betaAtk: 0, betaDef: 0,
    V: 0,
  }));

  const ejercitos = new Map<number, Ejercito>();
  let proximoEjercitoId = 0;

  // Capitales
  caps.forEach((idProv, idJug) => {
    const p = provincias[idProv];
    p.c = idJug;
    p.Pob = ganancia(0.5 * p.K);
    p.lealtad = cfg.params.lambdaEq;
    ejercitos.set(proximoEjercitoId, {
      id: proximoEjercitoId, jugador: idJug,
      S: 500, M: 80, X: 0, u: idProv,
      combatioEsteTurno: false, vivo: true,
    });
    proximoEjercitoId++;
  });

  // Neutrales, con guarnición proporcional a la población: sin ella, expandirse
  // sería gratis (§4.5 del spec).
  for (const p of provincias) {
    if (p.c !== -1) continue;
    p.Pob = ganancia(0.3 * p.K);
    ejercitos.set(proximoEjercitoId, {
      id: proximoEjercitoId, jugador: -1,
      S: perdida(0.02 * p.Pob), M: 60, X: 0, u: p.id,
      combatioEsteTurno: false, vivo: true,
    });
    proximoEjercitoId++;
  }

  const n = cfg.nJugadores;
  const lef = crearLEF();
  insertar(lef, 1, P.INICIO_TURNO, "INICIO_TURNO", {});   // §4.2

  return {
    t: 0,
    rng: { z: cfg.semilla },
    lef,
    jugadores,
    provincias,
    ejercitos,
    proximoEjercitoId,
    relaciones: Array.from({ length: n }, () => Array(n).fill(0)),
    acuerdos: [],
    params: cfg.params,
    series: {
      nFrac: Array.from({ length: n }, () => []),
      E: Array.from({ length: n }, () => []),
      V: Array.from({ length: n }, () => []),
    },
    fin: null,
  };
}
