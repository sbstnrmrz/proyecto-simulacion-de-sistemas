/** Una observación del diseño: nivel de A, nivel de B, y la respuesta. */
export type Observacion = { a: number; b: number; y: number };

export type FilaAnova = {
  fuente: string;
  sc: number;              // suma de cuadrados
  gl: number;              // grados de libertad
  cm: number | null;       // cuadrado medio = sc/gl
  f: number | null;        // F = cm / cm_error; null si no aplica
};

export type TablaAnova = {
  a: FilaAnova; b: FilaAnova; ab: FilaAnova;
  error: FilaAnova; total: FilaAnova;
  fCritico: { efectosPrincipales: number; interaccion: number };
};

/**
 * ANOVA de dos factores con interacción, diseño balanceado y de efectos fijos.
 * Es el análisis que pide el §7 del documento.
 *
 * Exige balance (mismo n en todas las celdas): con celdas desiguales las sumas
 * de cuadrados dejan de ser ortogonales y estas fórmulas darían un resultado
 * incorrecto en silencio. Por eso lanza en vez de calcular.
 */
export function anovaDosFactores(obs: Observacion[]): TablaAnova {
  if (obs.length === 0) throw new Error("anova: sin observaciones");

  const nivelesA = [...new Set(obs.map((o) => o.a))].sort((x, y) => x - y);
  const nivelesB = [...new Set(obs.map((o) => o.b))].sort((x, y) => x - y);
  const A = nivelesA.length, B = nivelesB.length;

  const celda = (i: number, j: number) =>
    obs.filter((o) => o.a === nivelesA[i] && o.b === nivelesB[j]);

  const n = celda(0, 0).length;
  for (let i = 0; i < A; i++)
    for (let j = 0; j < B; j++)
      if (celda(i, j).length !== n)
        throw new Error(
          `anova: diseño sin balance — la celda (${i},${j}) tiene ` +
          `${celda(i, j).length} observaciones y se esperaban ${n}`);

  const N = A * B * n;
  const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  const granMedia = media(obs.map((o) => o.y));
  const mediaA = nivelesA.map((_, i) =>
    media(obs.filter((o) => o.a === nivelesA[i]).map((o) => o.y)));
  const mediaB = nivelesB.map((_, j) =>
    media(obs.filter((o) => o.b === nivelesB[j]).map((o) => o.y)));

  let scA = 0, scB = 0, scAB = 0, scError = 0;
  for (let i = 0; i < A; i++) scA += B * n * (mediaA[i] - granMedia) ** 2;
  for (let j = 0; j < B; j++) scB += A * n * (mediaB[j] - granMedia) ** 2;

  for (let i = 0; i < A; i++) {
    for (let j = 0; j < B; j++) {
      const ys = celda(i, j).map((o) => o.y);
      const mCelda = media(ys);
      scAB += n * (mCelda - mediaA[i] - mediaB[j] + granMedia) ** 2;
      for (const y of ys) scError += (y - mCelda) ** 2;
    }
  }

  const scTotal = obs.reduce((s, o) => s + (o.y - granMedia) ** 2, 0);

  const glA = A - 1, glB = B - 1, glAB = (A - 1) * (B - 1);
  const glError = A * B * (n - 1), glTotal = N - 1;

  const cmError = glError > 0 ? scError / glError : 0;
  const fila = (fuente: string, sc: number, gl: number): FilaAnova => {
    const cm = gl > 0 ? sc / gl : null;
    return { fuente, sc, gl, cm, f: cm !== null && cmError > 0 ? cm / cmError : null };
  };

  return {
    a: fila("Factor A", scA, glA),
    b: fila("Factor B", scB, glB),
    ab: fila("Interacción A×B", scAB, glAB),
    error: { fuente: "Error", sc: scError, gl: glError, cm: cmError, f: null },
    total: { fuente: "Total", sc: scTotal, gl: glTotal, cm: null, f: null },
    // Valores críticos al 5 % para el diseño del §7 (gl error = 261).
    // Con gl del denominador tan alto son prácticamente los asintóticos.
    fCritico: { efectosPrincipales: 3.03, interaccion: 2.41 },
  };
}
