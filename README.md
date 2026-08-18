# Age of Conquest

Simulador con canvas y game loop de paso fijo, en TypeScript.

## Requisitos

- Node.js 18+ (recomendado 20 o 22)
- [pnpm](https://pnpm.io/installation) 9+ (`npm install -g pnpm` o `corepack enable pnpm`)

## Instalación

```bash
pnpm install
```

## Ejecución

Levantar el servidor de desarrollo (con recarga en caliente):

```bash
pnpm dev
```

Abrir la URL que imprime la consola, normalmente <http://localhost:5173>.

## Otros comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo con hot reload |
| `pnpm build` | Chequea tipos y genera el build de producción en `dist/` |
| `pnpm preview` | Sirve localmente el contenido de `dist/` para probar el build |
| `pnpm exec tsc --noEmit` | Solo chequeo de tipos, sin generar archivos |

## Estructura

```
.
├── index.html        # Página con el <canvas> centrado; carga el módulo TS
├── game/
│   └── main.ts       # Game loop: update() + render()
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## Debug

El botón **Debug** (arriba a la izquierda) muestra u oculta un overlay dibujado
sobre el canvas con:

- **FPS** — frames por segundo, promediados en ventanas de 0.5 s.
- **Frame** — milisegundos por frame (el inverso de los FPS, útil para ver el costo real).
- **Ticks/f** — cuántos ticks de simulación se ejecutaron en el último frame.
  En régimen normal alterna entre 0 y 1; valores altos y sostenidos significan
  que la simulación no llega a seguirle el ritmo al reloj.

## Sobre el game loop

El loop usa **paso fijo con acumulador**: `update()` siempre avanza exactamente
`1/60` de segundo, sin importar los FPS reales del navegador. Esto hace que la
simulación sea determinista y reproducible entre máquinas, a diferencia de
integrar con el delta variable de cada frame.

- El `while` ejecuta los ticks necesarios para alcanzar el tiempo real (0, 1 o varios por frame).
- `MAX_FRAME` limita el salto máximo por frame para evitar la "espiral de la muerte"
  tras un freeze (por ejemplo, al cambiar de pestaña).
- `update()` (física) y `render()` (dibujo) están separadas: para agregar tu
  simulación, modificá `update` y el tipo `State`.
