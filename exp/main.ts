import { correrLoteProgresivo, NIVELES_A, NIVELES_B } from "./runner";
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

$("correr").addEventListener("click", async () => {
  ($("correr") as HTMLButtonElement).disabled = true;
  $("progreso").textContent = "Corriendo…";

  const t0 = performance.now();
  const r = await correrLoteProgresivo((hechas, total) => {
    $("progreso").textContent = `Corriendo… ${hechas} de ${total}`;
  });
  const ms = Math.round(performance.now() - t0);

  const anovaT = anovaDosFactores(observaciones(r.corridas, (c) => c.tVic));
  const anovaC = anovaDosFactores(observaciones(r.corridas, (c) => c.colapsados / c.nJugadores));

  $("progreso").textContent = `270 corridas en ${ms} ms.`;
  $("salida").innerHTML =
    tablaCeldas(r) +
    tablaAnova("ANOVA — turnos hasta la victoria", anovaT,
      "Factor A: número de jugadores. Factor B: mantenimiento militar γ. " +
      "La respuesta está censurada en las corridas que terminaron por horizonte; " +
      "ver la columna «Por horizonte» de la tabla anterior. Por encima de una fracción " +
      "censurada de aproximadamente 20–30 % el supuesto de normalidad del ANOVA deja de " +
      "sostenerse y el F de esa fila no es interpretable como prueba de hipótesis, aunque " +
      "se calcule igual; no alcanza con reportar la fracción, hay que decir que la celda " +
      "queda fuera del análisis paramétrico.") +
    tablaAnova("ANOVA — tasa de colapso por jugador de la réplica", anovaC,
      "Respuesta: colapsados / nJugadores de cada réplica (no el conteo crudo). El conteo " +
      "crudo de colapsados escala con el propio Factor A —con 8 jugadores hay más candidatos " +
      "a colapsar que con 3— y eso basta para inflar el efecto de A de forma espuria: con el " +
      "conteo crudo el Factor A daba F = 3,55 (apenas por encima del crítico de 3,03) y al " +
      "normalizar por jugador cae a F ≈ 1,06 (no significativo), y encima el orden se invierte: " +
      "con γ = 0,20 colapsa el 18,9 % de los jugadores con 3 jugadores en la partida, contra " +
      "4,6 % con 8. Un resultado que se da vuelta al cambiar el denominador no se puede " +
      "presentar como hallazgo, así que se reporta la tasa por jugador, que sí controla el " +
      "denominador y mantiene el diseño balanceado (30 réplicas por celda). La tasa de la " +
      "ec. 3.37 —cociente de sumas de celda sobre los jugadores que llegaron al 40 %, no " +
      "sobre todos— es la que define el documento y sigue estando en la tabla de resumen; " +
      "no es la misma cantidad que esta respuesta por réplica y no se puede comparar directo.") +
    `<p><button id="csv">Descargar CSV (270 filas)</button></p>`;

  $("csv").addEventListener("click", () => descargarCSV(r.corridas));
});
