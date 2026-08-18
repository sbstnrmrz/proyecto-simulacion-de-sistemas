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

let lastTime = performance.now();
let accumulator = 0;

function loop(now: number): void {
  let frameTime = (now - lastTime) / 1000;
  lastTime = now;
  if (frameTime > MAX_FRAME) frameTime = MAX_FRAME;

  accumulator += frameTime;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
