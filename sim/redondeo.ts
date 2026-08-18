/** Saturación §1.2 del modelo: max(a, min(b, x)). */
export const clamp = (x: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, x));

/**
 * Redondeo de pérdidas: hacia arriba. §5.3 del modelo fija este criterio
 * conservador para que ningún imperio gane recursos por sesgo de redondeo
 * a lo largo de 300 turnos.
 */
export const perdida = (x: number): number => Math.ceil(x);

/** Redondeo de ganancias: hacia abajo. Contraparte de `perdida`. */
export const ganancia = (x: number): number => Math.floor(x);
