import type { Estado, Provincia } from "../sim/tipos";
import type { Evento } from "../sim/lef";
import { P } from "../sim/lef";

/**
 * Nombres de las nueve clases de prioridad de la tabla del §4.1. Se derivan
 * de `P` (sim/lef.ts) en vez de repetirse a mano: son literalmente el nombre
 * de la clase de prioridad, y mostrarlos junto al número permite leer la
 * regla de ordenamiento: dos eventos del mismo turno salen por prioridad, y
 * a igual prioridad por orden de encolado.
 */
export const NOMBRE_PRIORIDAD: Record<number, string> = Object.fromEntries(
  Object.entries(P).map(([nombre, prioridad]) => [prioridad, nombre]),
);

export type FilaJugador = {
  id: number; activo: boolean;
  provincias: number; poblacion: number; efectivos: number;
  oro: number; comida: number; investigacion: number;
  tecnologias: number; puntuacion: number;
};

export function filasJugadores(st: Estado): FilaJugador[] {
  return st.jugadores.map((j) => {
    const mias = st.provincias.filter((p) => p.c === j.id);
    let efectivos = 0;
    for (const e of st.ejercitos.values())
      if (e.vivo && e.jugador === j.id) efectivos += e.S;
    return {
      id: j.id, activo: j.activo,
      provincias: mias.length,
      poblacion: mias.reduce((s, p) => s + p.Pob, 0),
      efectivos,
      oro: j.E, comida: j.F, investigacion: j.RD,
      tecnologias: j.tecnologias.size,
      puntuacion: j.V,
    };
  });
}

export type FilaProvincia = {
  id: number; nombre: string; dueno: number; duenoTexto: string;
  poblacion: number; capacidad: number; lealtad: number;
  estado: Provincia["estado"]; mejoras: string;
};

export function filasProvincias(st: Estado): FilaProvincia[] {
  return st.provincias.map((p) => ({
    id: p.id, nombre: p.nombre,
    dueno: p.c,
    duenoTexto: p.c === -1 ? "neutral" : String(p.c),
    poblacion: p.Pob, capacidad: p.K,
    lealtad: p.lealtad, estado: p.estado,
    mejoras: p.mejoras.join(", ") || "—",
  }));
}

export type FilaEjercito = {
  id: number; jugador: number; jugadorTexto: string;
  efectivos: number; moral: number; experiencia: number;
  ubicacion: number; ubicacionNombre: string;
};

/** Sólo los vivos: los muertos esperan la limpieza del cierre de turno (§5.3). */
export function filasEjercitos(st: Estado): FilaEjercito[] {
  return [...st.ejercitos.values()]
    .filter((e) => e.vivo)
    .map((e) => ({
      id: e.id, jugador: e.jugador,
      jugadorTexto: e.jugador === -1 ? "neutral" : String(e.jugador),
      efectivos: e.S, moral: e.M, experiencia: e.X,
      ubicacion: e.u, ubicacionNombre: st.provincias[e.u].nombre,
    }));
}

export type CeldaRelacion = { valor: number; enGuerra: boolean; esDiagonal: boolean };

export function matrizRelaciones(st: Estado): CeldaRelacion[][] {
  return st.relaciones.map((fila, a) =>
    fila.map((valor, b) => ({
      valor,
      enGuerra: a !== b && valor <= st.params.rGuerra,
      esDiagonal: a === b,
    })));
}

export type EventoDescrito = {
  clave: string; tipo: string; prioridad: string; detalle: string;
};

/** §4.1 — la clave completa es lo que hace determinista la simulación. */
export function describirEvento(e: Evento): EventoDescrito {
  const d = e.datos ?? {};
  const partes: string[] = [];
  if (typeof d.jugador === "number") partes.push(`jugador ${d.jugador}`);
  if (typeof d.ejercito === "number") partes.push(`ejército ${d.ejercito}`);
  if (typeof d.atacante === "number") partes.push(`atacante ${d.atacante}`);
  if (typeof d.provincia === "number") partes.push(`provincia ${d.provincia}`);
  if (typeof d.destino === "number") partes.push(`destino ${d.destino}`);
  if (typeof d.mejora === "string") partes.push(d.mejora);
  return {
    clave: `(${e.t}, ${e.p}, ${e.sec})`,
    tipo: e.tipo,
    prioridad: NOMBRE_PRIORIDAD[e.p] ?? String(e.p),
    detalle: partes.join(", "),
  };
}
