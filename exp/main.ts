import { correrLote, NIVELES_A, NIVELES_B } from "./runner";
import { anovaDosFactores, type Observacion, type TablaAnova, type FilaAnova } from "./anova";
import { aCSV } from "./csv";
import type { Corrida, Resumen } from "./tipos";

const $ = (id: string) => document.getElementById(id)!;
const num = (x: number, d = 2) => x.toFixed(d);

function tablaCeldas(r: Resumen): string {
  const filas = r.celdas.map((c) => `
    <tr>
      <td>${c.nJugadores}</td><td>${c.gamma}</td>
      <td>${num(c.mediaTVic, 1)}</td><td>${num(c.varianzaTVic, 1)}</td>
      <td>[${num(c.ic95[0], 1)}, ${num(c.ic95[1], 1)}]</td>
      <td>${num(c.fraccionHorizonte * 100, 0)} %</td>
      <td>${c.colapsados}/${c.llegaronA40}</td>
      <td>${c.tasaColapso === null ? "N/D" : num(c.tasaColapso * 100, 1) + " %"}</td>
    </tr>`).join("");

  return `
    <h2>Resumen por celda</h2>
    <table>
      <tr>
        <th>Jugadores</th><th>γ</th><th>T̄<sub>vic</sub></th><th>s²</th>
        <th>IC 95 %</th><th>Por horizonte</th><th>Colapsos</th><th>Tasa (ec. 3.37)</th>
      </tr>${filas}
    </table>
    <p class="nota">
      «Por horizonte» es la fracción de réplicas que llegaron a T<sub>max</sub> sin vencedor.
      Esas corridas no midieron turnos hasta la victoria sino su ausencia, así que donde esa
      fracción es alta la media está censurada y hay que decirlo al interpretarla (§5.3).
    </p>`;
}

function tablaAnova(titulo: string, t: TablaAnova, nota: string): string {
  const fila = (f: FilaAnova, critico?: number) => `
    <tr>
      <td class="txt">${f.fuente}</td>
      <td>${num(f.sc, 2)}</td><td>${f.gl}</td>
      <td>${f.cm === null ? "—" : num(f.cm, 2)}</td>
      <td>${f.f === null ? "—" : num(f.f, 3)}</td>
      <td>${critico === undefined || f.f === null ? "—"
            : f.f > critico ? `significativo (F > ${critico})`
            : `no significativo (F ≤ ${critico})`}</td>
    </tr>`;

  const criticoPrincipales = t.fCritico?.efectosPrincipales;
  const criticoInteraccion = t.fCritico?.interaccion;

  const notaCritico = t.fCritico === null
    ? `<p class="nota">Los valores críticos de F al 5 % tabulados en este código están
        calculados únicamente para el diseño 3×3 con 30 réplicas del §7 (gl error = 261,
        gl efectos principales = 2, gl interacción = 4). Los grados de libertad de esta
        tabla no coinciden con ese diseño, así que la columna «Al 5 %» no puede juzgar
        significancia con esos valores y se deja en blanco.</p>`
    : "";

  return `
    <h2>${titulo}</h2>
    <table>
      <tr><th class="txt">Fuente</th><th>SC</th><th>gl</th><th>CM</th><th>F</th><th class="txt">Al 5 %</th></tr>
      ${fila(t.a, criticoPrincipales)}
      ${fila(t.b, criticoPrincipales)}
      ${fila(t.ab, criticoInteraccion)}
      ${fila(t.error)}
      ${fila(t.total)}
    </table>
    <p class="nota">${nota}</p>
    ${notaCritico}`;
}

const observaciones = (cs: Corrida[], y: (c: Corrida) => number): Observacion[] =>
  cs.map((c) => ({
    a: NIVELES_A.indexOf(c.nJugadores),
    b: NIVELES_B.indexOf(c.gamma),
    y: y(c),
  }));

function descargarCSV(corridas: Corrida[]): void {
  const url = URL.createObjectURL(new Blob([aCSV(corridas)], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "experimento.csv";
  a.click();
  URL.revokeObjectURL(url);
}

$("correr").addEventListener("click", () => {
  ($("correr") as HTMLButtonElement).disabled = true;
  $("progreso").textContent = "Corriendo…";

  // Un frame para que el navegador pinte el mensaje antes de bloquearse.
  requestAnimationFrame(() => {
    const t0 = performance.now();
    const r = correrLote();
    const ms = Math.round(performance.now() - t0);

    const anovaT = anovaDosFactores(observaciones(r.corridas, (c) => c.tVic));
    const anovaC = anovaDosFactores(observaciones(r.corridas, (c) => c.colapsados));

    $("progreso").textContent = `270 corridas en ${ms} ms.`;
    $("salida").innerHTML =
      tablaCeldas(r) +
      tablaAnova("ANOVA — turnos hasta la victoria", anovaT,
        "Factor A: número de jugadores. Factor B: mantenimiento militar γ. " +
        "La respuesta está censurada en las corridas que terminaron por horizonte; " +
        "ver la columna correspondiente de la tabla anterior.") +
      tablaAnova("ANOVA — jugadores colapsados por réplica", anovaC,
        "La ec. 3.37 define la tasa de colapso como un cociente de celda, no como una " +
        "medición por réplica, así que no entra en un ANOVA balanceado. Acá se analiza el " +
        "número de jugadores colapsados en cada réplica, que mide el mismo fenómeno y sí " +
        "está definido réplica a réplica. La tasa de la ec. 3.37 está en la tabla de resumen. " +
        "Nótese que esta respuesta depende del número de jugadores por construcción: con 8 " +
        "hay más candidatos a colapsar que con 3, y eso es parte del efecto del Factor A.") +
      `<p><button id="csv">Descargar CSV (270 filas)</button></p>`;

    $("csv").addEventListener("click", () => descargarCSV(r.corridas));
  });
});
