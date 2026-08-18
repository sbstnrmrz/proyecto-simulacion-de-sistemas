import minecraftUrl from "../assets/Minecraft.ttf";
import { createUI, type Rect } from "./ui/imgui";

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

// Minecraft.ttf es una fuente de píxeles: se ve nítida en múltiplos de 8 px.
const DEBUG_FONT = "16px Minecraft, ui-monospace, monospace";
const LINE_HEIGHT = 20;
const PADDING = 8;

function renderDebug(): void {
  const lines = [
    `FPS     ${debug.fps.toFixed(1)}`,
    `Frame   ${debug.frameMs.toFixed(2)} ms`,
    `Ticks/f ${debug.ticks}`,
  ];

  ctx.save();
  ctx.font = DEBUG_FONT;
  ctx.textBaseline = "top";

  // La caja se mide a partir del texto: la fuente no es monoespaciada y sus
  // anchos no coinciden con los de la fuente de fallback.
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width));

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(
    PADDING,
    PADDING,
    width + PADDING * 2,
    lines.length * LINE_HEIGHT + PADDING,
  );

  ctx.fillStyle = "#7ddf7d";
  lines.forEach((line, i) =>
    ctx.fillText(line, PADDING * 2, PADDING + 5 + i * LINE_HEIGHT),
  );
  ctx.restore();
}

// --- UI ------------------------------------------------------------------

const ui = createUI(canvas, ctx);

const BUTTON_W = 190;
const BUTTON_H = 40;
const BUTTON_GAP = 12;

const MENU: { id: string; label: string; action: () => void }[] = [
  {
    id: "menu.new-game",
    label: "Nueva partida",
    action: () => console.log("TODO: nueva partida"),
  },
  {
    id: "menu.load-game",
    label: "Cargar partida",
    action: () => console.log("TODO: cargar partida"),
  },
  {
    id: "menu.settings",
    label: "Ajustes",
    action: () => console.log("TODO: ajustes"),
  },
];

/** Rect del i-ésimo botón de una columna centrada en el canvas. */
function menuSlot(index: number, total: number): Rect {
  const columnHeight = total * BUTTON_H + (total - 1) * BUTTON_GAP;
  return {
    x: (canvas.width - BUTTON_W) / 2,
    y: (canvas.height - columnHeight) / 2 + index * (BUTTON_H + BUTTON_GAP),
    w: BUTTON_W,
    h: BUTTON_H,
  };
}

function renderUI(): void {
  ui.beginFrame();

  MENU.forEach((item, i) => {
    if (ui.button(item.label, menuSlot(i, MENU.length), { id: item.id })) {
      item.action();
    }
  });

  const debugSlot: Rect = { x: canvas.width - 104, y: 16, w: 88, h: 30 };
  if (ui.button("Debug", debugSlot, { id: "debug.toggle", on: debug.visible })) {
    debug.visible = !debug.visible;
  }

  ui.endFrame();
}

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
  renderUI();

  sampleDebug(rawDelta, ticks);
  if (debug.visible) renderDebug();

  requestAnimationFrame(loop);
}

// --- Arranque ------------------------------------------------------------

// El canvas no espera fuentes: si dibujáramos antes de que Minecraft.ttf esté
// lista, fillText caería en silencio al fallback.
async function loadFont(): Promise<void> {
  const font = new FontFace("Minecraft", `url(${minecraftUrl})`);
  await font.load();
  document.fonts.add(font);
}

loadFont()
  .catch((err) => console.error("No se pudo cargar Minecraft.ttf:", err))
  .finally(() => {
    // Se reinicia el reloj: si no, el primer delta incluiría la carga de la
    // fuente y el acumulador arrancaría con un salto de ticks.
    lastTime = performance.now();
    requestAnimationFrame(loop);
  });
