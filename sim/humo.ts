import { correr } from "./motor";
import { crearPartida, configPorDefecto } from "./inicial";

// Prueba de humo temporal hasta que exista la UI de la Fase 3.
// `game/` queda intacto en disco y en git: sólo se desconectó de index.html.
const cfg = configPorDefecto({ semilla: 12_345, nJugadores: 5 });
const st = crearPartida(cfg);
const r = correr(st);

const filas = st.jugadores.map((j) => {
  const serie = st.series.nFrac[j.id];
  const max = Math.max(...serie);
  return `  jugador ${j.id}: max territorio ${(max * 100).toFixed(0)}%  V=${j.V.toFixed(1)}  ${j.activo ? "activo" : "eliminado"}`;
});

document.body.innerHTML = `<pre style="font:14px ui-monospace,monospace;padding:1rem">
Partida terminada en t=${r.tVic} por ${r.motivo}. Ganador: jugador ${r.ganador}.

${filas.join("\n")}

Colapsos (ec. 3.36): ${r.colapsos.filter((c) => c.colapso).length}
Llegaron al 40%:     ${r.colapsos.filter((c) => c.llegoA40).length}
</pre>`;
