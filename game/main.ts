const canvasEl = document.getElementById("canvas");
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error("No se encontró el <canvas id='canvas'>");
}
const canvas = canvasEl;

const ctx2d = canvas.getContext("2d");
if (!ctx2d) throw new Error("No se pudo obtener el contexto 2D");
const ctx = ctx2d;

// Paso fijo de simulación: la física avanza siempre en incrementos iguales,
// independientemente de los FPS del navegador. Esto la hace determinista.
const STEP = 1 / 60; // segundos por tick
const MAX_FRAME = 0.25; // techo anti "espiral de la muerte" tras un freeze

type State = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
};

const state: State = {
  x: 100,
  y: 100,
  vx: 220,
  vy: 160,
  size: 40,
};

function update(dt: number): void {
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  if (state.x < 0) {
    state.x = 0;
    state.vx = -state.vx;
  } else if (state.x + state.size > canvas.width) {
    state.x = canvas.width - state.size;
    state.vx = -state.vx;
  }

  if (state.y < 0) {
    state.y = 0;
    state.vy = -state.vy;
  } else if (state.y + state.size > canvas.height) {
    state.y = canvas.height - state.size;
    state.vy = -state.vy;
  }
}

function render(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "crimson";
  ctx.fillRect(state.x, state.y, state.size, state.size);
}

// --- Debug ---------------------------------------------------------------

// Los FPS se promedian sobre una ventana en vez de calcularse frame a frame:
// 1/delta instantáneo salta tanto entre frames que el número es ilegible.
const DEBUG_WINDOW = 0.5; // segundos entre refrescos del contador

const debug = {
  visible: true,
  frames: 0, // frames acumulados en la ventana actual
  elapsed: 0, // segundos acumulados en la ventana actual
  fps: 0,
  frameMs: 0,
  ticks: 0, // ticks de simulación del último frame
};

function sampleDebug(rawDelta: number, ticks: number): void {
  debug.frames++;
  debug.elapsed += rawDelta;
  debug.ticks = ticks;

  if (debug.elapsed >= DEBUG_WINDOW) {
    debug.fps = debug.frames / debug.elapsed;
    debug.frameMs = (debug.elapsed * 1000) / debug.frames;
    debug.frames = 0;
    debug.elapsed = 0;
  }
}

function renderDebug(): void {
  const lines = [
    `FPS       ${debug.fps.toFixed(1)}`,
    `Frame     ${debug.frameMs.toFixed(2)} ms`,
    `Ticks/f   ${debug.ticks}`,
  ];

  ctx.save();
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(8, 8, 150, lines.length * 16 + 10);

  ctx.fillStyle = "#7ddf7d";
  lines.forEach((line, i) => ctx.fillText(line, 14, 13 + i * 16));
  ctx.restore();
}

const toggle = document.getElementById("debug-toggle");
toggle?.addEventListener("click", () => {
  debug.visible = !debug.visible;
  toggle.setAttribute("aria-pressed", String(debug.visible));
});

let lastTime = performance.now();
let accumulator = 0;

function loop(now: number): void {
  const rawDelta = (now - lastTime) / 1000; // sin recortar: es el costo real del frame
  lastTime = now;

  accumulator += Math.min(rawDelta, MAX_FRAME);

  let ticks = 0;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
    ticks++;
  }

  render();

  sampleDebug(rawDelta, ticks);
  if (debug.visible) renderDebug();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
