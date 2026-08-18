// UI de modo inmediato (estilo IMGUI): los widgets no son objetos que viven
// entre frames. Cada frame se los vuelve a declarar y la función devuelve lo
// que pasó con ellos. El único estado persistente es el del puntero y qué
// widget está "hot" (bajo el cursor) o "active" (apretado).

export type Rect = { x: number; y: number; w: number; h: number };

export type ButtonOptions = {
  /**
   * Identidad del widget entre frames. Por defecto es el label, que alcanza
   * mientras los textos sean únicos; conviene darlo explícito cuando el label
   * es dinámico o puede repetirse (el label es presentación, el id es
   * identidad, y no tienen por qué cambiar juntos).
   */
  id?: string;
  /** Dibuja el botón en estado encendido (para toggles). */
  on?: boolean;
  disabled?: boolean;
};

export type UI = {
  beginFrame(): void;
  endFrame(): void;
  button(label: string, rect: Rect, options?: ButtonOptions): boolean;
};

const COLORS = {
  face: "#3a3a3a",
  faceHover: "#4a4a4a",
  facePressed: "#2e2e2e",
  faceOn: "#7ddf7d",
  border: "#555",
  borderHover: "#6a6a6a",
  text: "#ddd",
  textOn: "#111",
};

const FONT = "16px Minecraft, system-ui, sans-serif";

function hits(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
}

export function createUI(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): UI {
  const mouse = {
    x: -1,
    y: -1,
    down: false,
    pressed: false, // flanco: se apretó desde el frame anterior
    released: false, // flanco: se soltó desde el frame anterior
  };

  // El widget bajo el cursor y el que se está apretando, por id.
  let hot: string | null = null;
  let active: string | null = null;

  // Ids vistos en el frame actual. Un id repetido hace que dos widgets
  // compartan hover y click, y es un bug difícil de ver a ojo, así que se
  // avisa en desarrollo. En el build de producción la rama se elimina.
  const seen = new Set<string>();

  // El canvas puede estar escalado por CSS respecto de su resolución interna,
  // así que las coordenadas del puntero se convierten al espacio del canvas.
  function toCanvasSpace(event: PointerEvent): void {
    const bounds = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - bounds.left) * canvas.width) / bounds.width;
    mouse.y = ((event.clientY - bounds.top) * canvas.height) / bounds.height;
  }

  canvas.addEventListener("pointermove", toCanvasSpace);

  canvas.addEventListener("pointerdown", (event) => {
    toCanvasSpace(event);
    mouse.down = true;
    mouse.pressed = true;
  });

  // El pointerup va en window: si arrastrás fuera del canvas y soltás, el
  // botón tiene que quedar liberado igual y no trabado en "active".
  window.addEventListener("pointerup", () => {
    mouse.down = false;
    mouse.released = true;
  });

  canvas.addEventListener("pointerleave", () => {
    mouse.x = -1;
    mouse.y = -1;
  });

  return {
    beginFrame(): void {
      hot = null;
      if (import.meta.env.DEV) seen.clear();
    },

    endFrame(): void {
      if (mouse.released) active = null;
      mouse.pressed = false;
      mouse.released = false;
      canvas.style.cursor = hot ? "pointer" : "default";
    },

    button(label: string, rect: Rect, options: ButtonOptions = {}): boolean {
      const id = options.id ?? label;

      if (import.meta.env.DEV) {
        if (seen.has(id)) {
          console.warn(
            `[ui] id duplicado: "${id}". Los widgets que lo comparten van a ` +
              `reaccionar juntos; pasá un id explícito en las opciones.`,
          );
        }
        seen.add(id);
      }

      const hovered = !options.disabled && hits(rect, mouse.x, mouse.y);

      if (hovered) hot = id;
      if (hovered && mouse.pressed) active = id;

      const held = active === id && hovered;
      // El click se confirma al soltar sobre el mismo botón donde se apretó:
      // apretar y arrastrar afuera cancela, como en cualquier UI nativa.
      const clicked = mouse.released && held;

      let face = COLORS.face;
      if (options.on) face = COLORS.faceOn;
      else if (held) face = COLORS.facePressed;
      else if (hovered) face = COLORS.faceHover;

      ctx.save();
      ctx.globalAlpha = options.disabled ? 0.5 : 1;

      ctx.fillStyle = face;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      ctx.strokeStyle = hovered ? COLORS.borderHover : COLORS.border;
      ctx.lineWidth = 2;
      // El offset de medio píxel evita que el borde salga difuminado entre dos
      // píxeles físicos.
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);

      ctx.font = FONT;
      ctx.fillStyle = options.on ? COLORS.textOn : COLORS.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        label,
        Math.round(rect.x + rect.w / 2),
        Math.round(rect.y + rect.h / 2),
      );
      ctx.restore();

      return clicked;
    },
  };
}
