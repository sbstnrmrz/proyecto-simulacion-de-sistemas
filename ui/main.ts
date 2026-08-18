import { crearPartida, configPorDefecto } from "../sim/inicial";
import { pasoEvento } from "../sim/motor";
import type { Estado } from "../sim/tipos";
import type { Evento } from "../sim/lef";
import {
  filasJugadores, filasProvincias, filasEjercitos,
  matrizRelaciones, describirEvento,
} from "./vista";
import { graficoTerritorio, COLORES_JUGADOR } from "./grafico";

const $ = (id: string) => document.getElementById(id)!;
const n = (x: number, d = 0) => x.toFixed(d);

const MAX_LOG = 200;
let st: Estado;
let log: Evento[] = [];
let auto: number | null = null;

function nuevaPartida(): void {
  const cfg = configPorDefecto({
    semilla: Number((<HTMLInputElement>$("semilla")).value) || 1,
    nJugadores: Number((<HTMLSelectElement>$("jugadores")).value),
  });
  cfg.params.gamma = Number((<HTMLInputElement>$("gamma")).value) || cfg.params.gamma;
  st = crearPartida(cfg);
  log = [];
  detenerAuto();
  pintar();
}

function unEvento(): void {
  if (st.fin) return;
  const e = pasoEvento(st);
  if (e) { log.push(e); if (log.length > MAX_LOG) log.shift(); }
  pintar();
}

function unTurno(): void {
  if (st.fin) return;
  const objetivo = st.t;
  for (;;) {
    const e = pasoEvento(st);
    if (!e) break;
    log.push(e);
    if (log.length > MAX_LOG) log.shift();
    if (st.fin || (e.tipo === "FIN_TURNO" && e.t >= objetivo)) break;
  }
  pintar();
}

function hastaElFinal(): void {
  detenerAuto();
  while (!st.fin && st.t <= st.params.tMax) {
    const e = pasoEvento(st);
    if (!e) break;
    log.push(e);
    if (log.length > MAX_LOG) log.shift();
  }
  pintar();
}

function detenerAuto(): void {
  if (auto !== null) { clearInterval(auto); auto = null; }
  $("auto").textContent = "Auto";
}

function alternarAuto(): void {
  if (auto !== null) { detenerAuto(); return; }
  $("auto").textContent = "Detener";
  auto = window.setInterval(() => {
    if (st.fin) { detenerAuto(); pintar(); return; }
    unTurno();
  }, 120);
}

function pintarReloj(): void {
  const ultimo = log[log.length - 1];
  const d = ultimo ? describirEvento(ultimo) : null;
  const fin = st.fin
    ? ` — terminada por ${st.fin.motivo}, gana el jugador ${st.fin.ganador}`
    : "";
  $("reloj").textContent = d
    ? `t = ${st.t}   último evento: ${d.clave} ${d.tipo}${fin}`
    : `t = ${st.t}${fin}`;
}

function tablaJugadores(): string {
  const filas = filasJugadores(st).map((f) => `
    <tr class="${f.activo ? "" : "eliminado"}">
      <td><span class="swatch" style="background:${COLORES_JUGADOR[f.id % COLORES_JUGADOR.length]}"></span> ${f.id}</td>
      <td>${f.provincias}</td><td>${n(f.poblacion)}</td><td>${n(f.efectivos)}</td>
      <td>${n(f.oro)}</td><td>${n(f.comida)}</td><td>${n(f.investigacion)}</td>
      <td>${f.tecnologias}</td><td>${n(f.puntuacion, 1)}</td>
      <td class="txt">${f.activo ? "" : "eliminado"}</td>
    </tr>`).join("");
  return `<h2>Jugadores</h2><table>
    <tr><th>id</th><th>prov.</th><th>población</th><th>efectivos</th><th>oro</th>
        <th>comida</th><th>I+D</th><th>tecn.</th><th>V</th><th class="txt"></th></tr>
    ${filas}</table>`;
}

function tablaProvincias(): string {
  const filas = filasProvincias(st).map((f) => `
    <tr>
      <td>${f.id}</td><td class="txt">${f.nombre}</td><td>${f.duenoTexto}</td>
      <td>${n(f.poblacion)}</td><td>${n(f.capacidad)}</td><td>${n(f.lealtad, 1)}</td>
      <td class="txt ${f.estado === "normal" ? "" : f.estado}">${f.estado}</td>
      <td class="txt">${f.mejoras}</td>
    </tr>`).join("");
  return `<h2>Provincias</h2><table>
    <tr><th>id</th><th class="txt">nombre</th><th>dueño</th><th>población</th>
        <th>capacidad</th><th>lealtad</th><th class="txt">estado</th><th class="txt">mejoras</th></tr>
    ${filas}</table>`;
}

function tablaEjercitos(): string {
  const fs = filasEjercitos(st);
  if (fs.length === 0) return `<h2>Ejércitos</h2><p class="nota">No queda ninguno.</p>`;
  const filas = fs.map((f) => `
    <tr><td>${f.id}</td><td>${f.jugadorTexto}</td><td>${n(f.efectivos)}</td>
        <td>${n(f.moral, 1)}</td><td>${n(f.experiencia, 1)}</td>
        <td class="txt">${f.ubicacionNombre}</td></tr>`).join("");
  return `<h2>Ejércitos</h2><table>
    <tr><th>id</th><th>dueño</th><th>efectivos</th><th>moral</th><th>exp.</th>
        <th class="txt">ubicación</th></tr>${filas}</table>`;
}

function tablaRelaciones(): string {
  const m = matrizRelaciones(st);
  const encabezado = m.map((_, j) => `<th>${j}</th>`).join("");
  const filas = m.map((fila, a) => `
    <tr><th>${a}</th>${fila.map((c) => `
      <td class="${c.esDiagonal ? "diagonal" : c.enGuerra ? "guerra" : ""}">
        ${c.esDiagonal ? "—" : n(c.valor)}
      </td>`).join("")}</tr>`).join("");
  return `<h2>Relaciones</h2><table><tr><th></th>${encabezado}</tr>${filas}</table>
    <p class="nota">Las celdas sombreadas están en guerra (R ≤ ${st.params.rGuerra}).
    La ec. 3.30 congela la relación ahí hasta que se ratifique un acuerdo.</p>`;
}

function tablaLog(): string {
  const filas = [...log].reverse().map((e) => {
    const d = describirEvento(e);
    return `<tr><td class="txt">${d.clave}</td><td class="txt">${d.tipo}</td>
      <td class="txt" style="color:#666">${d.prioridad}</td>
      <td class="txt" style="color:#666">${d.detalle}</td></tr>`;
  }).join("");
  return `<table>${filas}</table>`;
}

function pintar(): void {
  pintarReloj();
  $("salida").innerHTML =
    tablaJugadores() +
    `<h2>Territorio</h2>${graficoTerritorio(st.series.nFrac)}` +
    tablaRelaciones() + tablaEjercitos() + tablaProvincias();
  $("log").innerHTML = tablaLog();

  const terminada = st.fin !== null;
  for (const id of ["evento", "turno", "fin", "auto"])
    (<HTMLButtonElement>$(id)).disabled = terminada;
}

$("nueva").addEventListener("click", nuevaPartida);
$("evento").addEventListener("click", unEvento);
$("turno").addEventListener("click", unTurno);
$("fin").addEventListener("click", hastaElFinal);
$("auto").addEventListener("click", alternarAuto);

nuevaPartida();
