import { TECNOLOGIAS } from "./datos/tecnologias";
import type { Estado, Jugador, TecId } from "./tipos";

/** ec. 3.13 — bonificaciones aditivas dentro de cada categoría. */
export function recalcularBetas(j: Jugador): void {
  let eco = 0, atk = 0, def = 0;
  for (const id of j.tecnologias) {
    const t = TECNOLOGIAS[id];
    eco += t.eEco; atk += t.eAtk; def += t.eDef;
  }
  j.betaEco = eco; j.betaAtk = atk; j.betaDef = def;
}

/** Tecnologías que el jugador aún no tiene y cuyos prerrequisitos cumple. */
export function disponibles(j: Jugador): TecId[] {
  return (Object.keys(TECNOLOGIAS) as TecId[]).filter(
    (id) => !j.tecnologias.has(id)
         && TECNOLOGIAS[id].prereq.every((p) => j.tecnologias.has(p)));
}

/** Heurística de la Guarda 4 (§4.5): la más barata que pueda investigar. */
export function mejorTecnologia(j: Jugador): TecId | null {
  const opciones = disponibles(j);
  if (opciones.length === 0) return null;
  return opciones.reduce((a, b) => TECNOLOGIAS[a].C <= TECNOLOGIAS[b].C ? a : b);
}

export function iniciarInvestigacion(st: Estado, j: Jugador, tec: TecId): void {
  if (j.investigando) return;
  j.investigando = { tec, t0: st.t };
}

/**
 * ec. 3.12 — completa en el primer turno que satisface tiempo mínimo Y costo.
 * Devuelve true si completó en esta llamada.
 */
export function intentarCompletar(st: Estado, j: Jugador): boolean {
  const inv = j.investigando;
  if (!inv) return false;
  const t = TECNOLOGIAS[inv.tec];
  if (st.t < inv.t0 + t.D) return false;
  if (j.RD < t.C) return false;

  j.RD -= t.C;
  j.tecnologias.add(inv.tec);
  j.investigando = null;
  recalcularBetas(j);
  return true;
}
