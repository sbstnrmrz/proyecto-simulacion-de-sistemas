import type { Estado } from "./tipos";

/**
 * Chequea los dominios declarados en la tabla del §2.1 del modelo.
 * Devuelve la lista de violaciones (vacía si todo está en orden).
 * Se corre al cierre de cada turno en los tests: 270 corridas × 300 turnos es
 * una barrida enorme del espacio de estados, y un `clamp` faltante salta acá.
 */
export function verificarDominios(st: Estado): string[] {
  const malas: string[] = [];
  const chk = (ok: boolean, msg: string) => { if (!ok) malas.push(msg); };

  chk(Number.isInteger(st.t) && st.t >= 0, `t inválido: ${st.t}`);

  for (const j of st.jugadores) {
    chk(j.E >= 0, `E_${j.id} = ${j.E} < 0`);
    chk(j.F >= 0, `F_${j.id} = ${j.F} < 0`);
    chk(j.RD >= 0, `RD_${j.id} = ${j.RD} < 0`);
    chk(Number.isFinite(j.V), `V_${j.id} no finito`);
  }

  for (const p of st.provincias) {
    chk(p.Pob >= 0 && p.Pob <= p.K, `Pob_${p.id} = ${p.Pob} fuera de [0, ${p.K}]`);
    chk(p.lealtad >= 0 && p.lealtad <= 100, `Λ_${p.id} = ${p.lealtad} fuera de [0,100]`);
    chk(p.c === -1 || (p.c >= 0 && p.c < st.jugadores.length), `c_${p.id} = ${p.c}`);
  }

  for (const e of st.ejercitos.values()) {
    chk(e.S >= 0, `S_${e.id} = ${e.S} < 0`);
    chk(e.M >= 0 && e.M <= 100, `M_${e.id} = ${e.M} fuera de [0,100]`);
    chk(e.X >= 0 && e.X <= 100, `X_${e.id} = ${e.X} fuera de [0,100]`);
  }

  for (let a = 0; a < st.relaciones.length; a++)
    for (let b = 0; b < st.relaciones.length; b++) {
      const R = st.relaciones[a][b];
      chk(R >= -100 && R <= 100, `R_${a}${b} = ${R} fuera de [−100,100]`);
      chk(R === st.relaciones[b][a], `R no es simétrica en (${a},${b})`);
    }

  return malas;
}
