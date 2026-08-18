import type { Parametros } from "../tipos";

/** Valores del §2.4 del modelo. Los marcados (★) son factores del §7. */
export const PARAMS: Parametros = {
  tau: 0.02, alpha: 0.01, sigma: 0.05,
  gamma: 0.1,          // ★ Factor B
  kappa: 0.6,          // ★
  iota: 0.2, psi: 1.0, r: 0.03, phi: 0.5,

  lambda: 0.08, NR: 5, epsRet: 0.25, epsMin: 0.8, epsMax: 1.2,
  deltaB: 40, deltaH: 25, deltaQ: 15,
  omegaV: 10, omegaD: 20,   // magnitudes positivas — errata §5.2 del spec
  rhoM: 0.15, M0: 60, dMax: 0.25, xi: 30,
  cR: 5, varpi: 0.5,

  rhoMin: 1.5, rhoDef: 1.2,
  nu: 0.05, zeta: 2, rGuerra: -100, rPaz: 30,
  pE: 0.05, thetaV: 70, tMax: 300,
  wP: 0.45, wH: 0.25, wS: 0.2, wT: 0.1,

  rhoLambda: 0.1, lambdaEq: 70, zetaG: 3, zetaH: 0.2,
  zetaM: 5, lambdaConq: 20, lambdaCrit: 25, lambdaRec: 40,

  chi: 5,
  w1: 0.3, w2: 0.2, w3: 0.2, w4: 0.3,

  // §4.4 del spec — no están en el modelo
  loteMin: 50, turnosEntrenamiento: 2, moralRecluta: 70,
};
