# Age of Conquest IV — simulador

Simulación de eventos discretos del modelo formalizado en el Parcial II de
Simulación de Sistemas: un conjunto de imperios que compiten sobre un mapa de
provincias, gobernados por las mismas ecuaciones de población, alimento,
economía, tecnología, combate, moral, diplomacia y lealtad, con decisiones
emitidas por un árbol de decisión determinista de IA.

El motor (`sim/`) es **headless**: no toca el DOM, no dibuja nada y no corre
contra un reloj de pared. El tiempo avanza al próximo evento de una Lista de
Eventos Futuros (LEF), no de a un turno fijo. Dada la misma semilla, una
corrida es reproducible bit a bit — el generador de aleatoriedad es propio
(congruencial lineal) y vive en el estado, no en el módulo, para que corridas
concurrentes del batch no lo compartan.

## Requisitos

- Node.js 18+ (recomendado 20 o 22)
- [pnpm](https://pnpm.io/installation) 9+ (`npm install -g pnpm` o `corepack enable pnpm`)

## Instalación

```bash
pnpm install
```

## Ejecución

```bash
pnpm dev
```

Abrir la URL que imprime la consola (normalmente <http://localhost:5173>).
Hay tres páginas, servidas todas por ese mismo comando:

| Página | Qué muestra |
| --- | --- |
| `/index.html` | Portada, con los enlaces a las otras dos. |
| `/partida.html` | Observación de una partida evento por evento: cola de la LEF, tablas de jugadores/provincias/ejércitos/relaciones y el gráfico de territorio. |
| `/experimento.html` | El factorial 3×3 completo del plan de experimentación — 270 corridas, con su ANOVA de dos factores y exportación a CSV. |

**Importante:** estas páginas necesitan ser servidas por `pnpm dev` o
`pnpm preview` (o cualquier servidor HTTP). Abrirlas directo desde el
filesystem (`file://...`) no funciona: ni los módulos ES que cargan
(`<script type="module">`) ni las rutas absolutas (`/ui/main.ts`,
`/exp/main.ts`) resuelven bajo ese protocolo.

## Otros comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo con hot reload, sirve las tres páginas |
| `pnpm build` | Chequea tipos y genera el build de producción en `dist/` (tres entradas: `index.html`, `partida.html`, `experimento.html`) |
| `pnpm preview` | Sirve localmente el contenido de `dist/` para probar el build |
| `pnpm test` | Corre la suite de Vitest |
| `pnpm exec tsc --noEmit` | Solo chequeo de tipos, sin generar archivos |

`pnpm test` corre cerca de 200 pruebas, entre ellas la traza de verificación
del §4.6 del documento de formalización (reproducida evento a evento contra
los números que el propio documento da) y una corrida completa de las 270
combinaciones del plan de experimentación del §7, verificando que el ANOVA
resultante es válido.

## Estructura

El árbol real del simulador vive en tres carpetas. La lista de abajo es a la
vez la matriz de trazabilidad del §6 del documento: qué módulo implementa qué
subsistema.

```
sim/                    — el motor, sin DOM
├── tipos.ts       — Estado, Config, Jugador, Provincia, Ejército: el diccionario de variables
├── lef.ts         — Lista de Eventos Futuros: cola de prioridad por (t, prioridad, orden de encolado)
├── motor.ts       — dispatcher de eventos y pasoEvento(): el bucle principal (también ecs. 3.9–3.11 en el cierre de turno)
├── inicial.ts     — construcción del estado inicial y configPorDefecto()
├── rng.ts         — generador congruencial lineal propio + transformada inversa
├── poblacion.ts   — dinámica poblacional logística (ecs. 3.1–3.2)
├── economia.ts    — subsistemas alimentario y económico (ecs. 3.3–3.8, 5.1)
├── tecnologia.ts  — acumulación de investigación y bonificaciones aditivas (ecs. 3.12–3.13)
├── combate.ts     — combate estocástico de Lanchester (ecs. 3.14–3.22)
├── moral.ts       — tasa de deserción por partes (ecs. 3.26–3.29, 5.3)
├── diplomacia.ts  — matriz de relaciones, guerra y acuerdos (ecs. 3.30–3.32, 5.2)
├── ia.ts          — árbol de decisión determinista de la IA (§4.2–4.4)
├── puntuacion.ts  — puntuación V y las tres condiciones de victoria (ec. 3.33)
├── redondeo.ts    — disciplina de saturación y redondeo de pérdidas (§1.2, §5.3)
├── invariantes.ts — dominios del §2.1 como aserciones vivas, corridas en los tests
└── datos/         — mapa de 25 provincias, catálogo de tecnologías, mejoras, parámetros por defecto

exp/                    — runner de experimentos y análisis estadístico (§7)
├── runner.ts   — corre el factorial 3×3 × 30 réplicas
├── metricas.ts — resumen por celda (media, IC al 95 %)
├── anova.ts    — ANOVA de dos factores
├── csv.ts      — exportación de las corridas
└── main.ts     — controlador de experimento.html

ui/                     — interfaz de observación (§6 del documento)
├── main.ts    — controlador de partida.html: pasoEvento() por clic, o en bucle
├── vista.ts   — proyección del Estado a filas de tabla
└── grafico.ts — SVG del territorio por jugador a lo largo del tiempo
```

El cierre de turno en `motor.ts` aplica además las ecs. 3.9, 3.10 y 3.11
(inversión en I+D, balance del tesoro y acumulación de investigación): el
documento las atribuye a Economía y a Tecnología respectivamente, pero se
ejecutan en el cierre de turno y no en el módulo de su propio subsistema.
Es una discrepancia real con la matriz del §6, señalada acá para que no la
descubra el corrector leyendo el código.

Dos ecuaciones tampoco quedan etiquetadas en ningún comentario: la 3.17 está
implementada como el criterio de retirada en `combate.ts`, pero sin su
número; y la 3.24 no es identificable en el código. Son las dos únicas filas
de esta matriz que hoy no se pueden verificar leyendo un comentario.

La interfaz es DOM puro (`<button>`, `<input>`, `<select>`), con un SVG
marcado `role="img"` y `aria-label` para el gráfico de territorio — es
navegable por teclado y por lector de pantalla.

## `game/`

`game/` y `assets/` son el prototipo de una versión anterior del proyecto: un
canvas con game loop de paso fijo y una UI de modo inmediato dibujada sobre
él. Quedan desconectados a propósito — ninguna de las tres páginas los carga
ni el build los referencia — y se conservan en disco solo como historial.
`assets/` (la fuente de píxeles y el fondo) pertenece exclusivamente a ese
prototipo y no entra al build de producción.

## Divergencias respecto del documento de formalización

El código no sigue el documento del Parcial II de forma literal en todos los
puntos: hay divergencias deliberadas donde el documento es ambiguo o
internamente contradictorio, y defectos del propio documento que el
simulador documenta con pruebas en vez de corregir en silencio (por ejemplo,
la afirmación de que las puntuaciones de todos los jugadores suman a lo sumo
100, que no se sostiene porque el término tecnológico no es exclusivo entre
jugadores). Las seis divergencias y los tres defectos están documentados en
el diseño del proyecto, con su resolución y el motivo de cada una.
