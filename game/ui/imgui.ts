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
  /** Color de relleno en hex (ej. "#3a6ea5"); si no se pasa, usa la paleta por defecto. */
  color?: string;
  /** Color del borde en hex; si no se pasa, usa la paleta por defecto. */
  borderColor?: string;
};

export type CheckboxOptions = {
  /** Igual que en button: por defecto es el label. */
  id?: string;
  disabled?: boolean;
};

export type DropdownOptions = {
  /**
   * A diferencia de button/checkbox es obligatorio: el desplegable no tiene
   * un label propio del que derivar un id (el texto visible es el de la
   * opción seleccionada, que cambia).
   */
  id: string;
  disabled?: boolean;
};

export type UI = {
  beginFrame(): void;
  endFrame(): void;
  button(label: string, rect: Rect, options?: ButtonOptions): boolean;
  /** Devuelve el estado (encendido/apagado) resultante de esta interacción. */
  checkbox(
    label: string,
    rect: Rect,
    checked: boolean,
    options?: CheckboxOptions,
  ): boolean;
  /**
   * Devuelve el índice seleccionado resultante de esta interacción (igual a
   * `selected` si no hubo click). El desplegable administra su propio estado
   * de abierto/cerrado internamente, indexado por `options.id`.
   */
  dropdown(
    items: string[],
    rect: Rect,
    selected: number,
    options: DropdownOptions,
  ): number;
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
const CHECKBOX_SIZE = 18;

/** Aclara (percent > 0) u oscurece (percent < 0) un color "#rrggbb". */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const channel = (shift: number): number => {
    const value = (num >> shift) & 0xff;
    return Math.min(255, Math.max(0, Math.round(value + 255 * percent)));
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hits(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
}

/** Rect de la i-ésima fila de opciones, apilada debajo del header del dropdown. */
function dropdownRow(header: Rect, index: number): Rect {
  return {
    x: header.x,
    y: header.y + header.h * (index + 1),
    w: header.w,
    h: header.h,
  };
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

  // Ids de los dropdowns actualmente abiertos. Vive entre frames porque,
  // a diferencia de hover/press, "abierto" es un estado que el widget
  // sostiene por sí mismo en vez de recibirlo del caller.
  const open = new Set<string>();

  // Dibujos diferidos hasta endFrame(), para que queden por encima de
  // cualquier otra cosa dibujada más tarde en el mismo frame (ej. la lista
  // de un dropdown no debe quedar tapada por el botón que se dibuja después).
  const overlay: Array<() => void> = [];

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

  function trackId(id: string): void {
    if (!import.meta.env.DEV) return;
    if (seen.has(id)) {
      console.warn(
        `[ui] id duplicado: "${id}". Los widgets que lo comparten van a ` +
          `reaccionar juntos; pasá un id explícito en las opciones.`,
      );
    }
    seen.add(id);
  }

  // Hover/press/click comparten esta misma mecánica en todos los widgets
  // clickeables: sólo cambia qué se dibuja según el resultado.
  function interact(
    id: string,
    rect: Rect,
    disabled: boolean | undefined,
  ): { hovered: boolean; held: boolean; clicked: boolean } {
    const hovered = !disabled && hits(rect, mouse.x, mouse.y);

    if (hovered) hot = id;
    if (hovered && mouse.pressed) active = id;

    const held = active === id && hovered;
    // El click se confirma al soltar sobre el mismo widget donde se apretó:
    // apretar y arrastrar afuera cancela, como en cualquier UI nativa.
    const clicked = mouse.released && held;

    return { hovered, held, clicked };
  }

  return {
    beginFrame(): void {
      hot = null;
      if (import.meta.env.DEV) seen.clear();
    },

    endFrame(): void {
      overlay.forEach((draw) => draw());
      overlay.length = 0;

      if (mouse.released) active = null;
      mouse.pressed = false;
      mouse.released = false;
      canvas.style.cursor = hot ? "pointer" : "default";
    },

    button(label: string, rect: Rect, options: ButtonOptions = {}): boolean {
      const id = options.id ?? label;
      trackId(id);

      const { hovered, held, clicked } = interact(id, rect, options.disabled);

      let face: string;
      if (options.on) face = COLORS.faceOn;
      else if (options.color) {
        if (held) face = shade(options.color, -0.15);
        else if (hovered) face = shade(options.color, 0.12);
        else face = options.color;
      } else if (held) face = COLORS.facePressed;
      else if (hovered) face = COLORS.faceHover;
      else face = COLORS.face;

      ctx.save();
      ctx.globalAlpha = options.disabled ? 0.5 : 1;

      ctx.fillStyle = face;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      if (options.borderColor) {
        ctx.strokeStyle = hovered
          ? shade(options.borderColor, 0.12)
          : options.borderColor;
      } else {
        ctx.strokeStyle = hovered ? COLORS.borderHover : COLORS.border;
      }
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

    checkbox(
      label: string,
      rect: Rect,
      checked: boolean,
      options: CheckboxOptions = {},
    ): boolean {
      const id = options.id ?? label;
      trackId(id);

      const { hovered, held, clicked } = interact(id, rect, options.disabled);
      // A diferencia de button, acá no hay un "clicked" que el caller deba
      // interpretar: el checkbox devuelve directamente su próximo estado.
      const next = clicked ? !checked : checked;

      const box: Rect = {
        x: rect.x,
        y: rect.y + (rect.h - CHECKBOX_SIZE) / 2,
        w: CHECKBOX_SIZE,
        h: CHECKBOX_SIZE,
      };

      ctx.save();
      ctx.globalAlpha = options.disabled ? 0.5 : 1;

      if (next) ctx.fillStyle = COLORS.faceOn;
      else if (held) ctx.fillStyle = COLORS.facePressed;
      else if (hovered) ctx.fillStyle = COLORS.faceHover;
      else ctx.fillStyle = COLORS.face;
      ctx.fillRect(box.x, box.y, box.w, box.h);

      ctx.strokeStyle = hovered ? COLORS.borderHover : COLORS.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);

      if (next) {
        ctx.strokeStyle = COLORS.textOn;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(box.x + 4, box.y + box.h / 2 + 1);
        ctx.lineTo(box.x + box.w / 2 - 1, box.y + box.h - 5);
        ctx.lineTo(box.x + box.w - 4, box.y + 4);
        ctx.stroke();
      }

      ctx.font = FONT;
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, box.x + box.w + 10, rect.y + rect.h / 2);

      ctx.restore();

      return next;
    },

    dropdown(
      items: string[],
      rect: Rect,
      selected: number,
      options: DropdownOptions,
    ): number {
      const { id } = options;
      trackId(id);

      const { hovered: headerHovered, clicked: headerClicked } = interact(
        id,
        rect,
        options.disabled,
      );

      const wasOpen = open.has(id);
      if (headerClicked) {
        if (wasOpen) open.delete(id);
        else open.add(id);
      }

      let next = selected;

      // Las filas no pasan por interact(): es una lista transitoria que se
      // cierra apenas se suelta, así que alcanza con reaccionar al flanco de
      // "pressed" en vez de llevar su propio hot/active por fila.
      if (wasOpen && !headerClicked) {
        let clickedRow = -1;
        let rowHovered = false;
        items.forEach((_, i) => {
          if (hits(dropdownRow(rect, i), mouse.x, mouse.y)) {
            rowHovered = true;
            if (mouse.pressed) clickedRow = i;
          }
        });
        if (rowHovered) hot = id;

        // Clickear afuera (ni el header ni una fila) también cierra la
        // lista, pero sin el click del header, que ya se manejó arriba.
        if (!headerHovered && mouse.pressed) {
          if (clickedRow !== -1) next = clickedRow;
          open.delete(id);
        }
      }

      const isOpen = open.has(id);

      ctx.save();
      ctx.globalAlpha = options.disabled ? 0.5 : 1;

      ctx.fillStyle = isOpen
        ? COLORS.facePressed
        : headerHovered
          ? COLORS.faceHover
          : COLORS.face;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      ctx.strokeStyle = headerHovered ? COLORS.borderHover : COLORS.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);

      ctx.font = FONT;
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(items[selected] ?? "", rect.x + 10, rect.y + rect.h / 2);

      ctx.textAlign = "right";
      ctx.fillText(isOpen ? "▲" : "▼", rect.x + rect.w - 10, rect.y + rect.h / 2);
      ctx.restore();

      // Se defiere a endFrame() para no quedar tapada por widgets que se
      // dibujen después de este en el mismo frame.
      if (isOpen) {
        overlay.push(() => {
          items.forEach((label, i) => {
            const row = dropdownRow(rect, i);
            const rowHovered = hits(row, mouse.x, mouse.y);

            ctx.save();
            ctx.fillStyle =
              i === selected
                ? COLORS.faceOn
                : rowHovered
                  ? COLORS.faceHover
                  : COLORS.face;
            ctx.fillRect(row.x, row.y, row.w, row.h);

            ctx.strokeStyle = COLORS.border;
            ctx.lineWidth = 1;
            ctx.strokeRect(row.x + 0.5, row.y + 0.5, row.w - 1, row.h - 1);

            ctx.font = FONT;
            ctx.fillStyle = i === selected ? COLORS.textOn : COLORS.text;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(label, row.x + 10, row.y + row.h / 2);
            ctx.restore();
          });
        });
      }

      return next;
    },
  };
}
