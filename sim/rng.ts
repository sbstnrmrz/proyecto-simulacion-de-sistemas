/**
 * Generador congruencial lineal del §3.6.1 del modelo (constantes de
 * Numerical Recipes). Vive en el estado, no en el módulo: dos corridas del
 * batch comparten proceso y deben ser independientes.
 */
const A = 1_664_525;
const C = 1_013_904_223;
const M = 2 ** 32;

export type Rng = { z: number };

/**
 * Avanza el generador. §5.3 advierte del desbordamiento: el producto máximo
 * es 1 664 525 × (2^32 − 1) ≈ 7,149e15, y 2^53 ≈ 9,007e15. ENTRA, así que la
 * aritmética con doubles es exacta. Es un margen del 20 %, no una propiedad
 * obvia: NO reescribir esto con `>>> 0` ni `Math.imul`, truncan distinto.
 */
function siguienteZ(rng: Rng): number {
  rng.z = (A * rng.z + C) % M;
  return rng.z;
}

/** U ~ Uniforme(0, 1). ec. 3.25 */
export function u(rng: Rng): number {
  return siguienteZ(rng) / M;
}

/** Uniforme continua en [a, b). Transformada inversa, §3.6.2 */
export function uniforme(rng: Rng, a: number, b: number): number {
  return a + (b - a) * u(rng);
}

/** Uniforme discreta en {0, …, n−1}. §3.6.2 */
export function uniformeDiscreta(rng: Rng, n: number): number {
  return Math.floor(u(rng) * n);
}

/** Bernoulli(p): ocurre ⟺ U ≤ p. §3.6.2 */
export function bernoulli(rng: Rng, p: number): boolean {
  return u(rng) <= p;
}

/** Discreta empírica: menor índice v tal que U ≤ acumuladas[v]. §3.6.2 */
export function empirica(rng: Rng, acumuladas: number[]): number {
  const x = u(rng);
  for (let v = 0; v < acumuladas.length; v++) if (x <= acumuladas[v]) return v;
  return acumuladas.length - 1; // sólo por error de redondeo en la última
}

/**
 * Normal(0, sigma) por Box–Muller. §3.6.2 — usada sólo para desempatar
 * objetivos de la IA (ec. 4.4).
 * u1 se acota por abajo: U puede valer exactamente 0 y ln(0) = −∞.
 */
export function normal(rng: Rng, sigma: number): number {
  const u1 = Math.max(u(rng), Number.EPSILON);
  const u2 = u(rng);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
}
