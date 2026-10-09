// Comparación palabra por palabra entre dos versiones de un texto (revisión de una semana reenviada).
// Módulo puro: servidor y cliente.

export type TipoCambio = "igual" | "agregado" | "eliminado";

export interface PiezaDiff {
  tipo: TipoCambio;
  texto: string;
}

/** Divide en palabras conservando espacios y saltos de línea como piezas propias. */
function tokens(texto: string) {
  return texto.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * Diferencias entre la versión anterior y la actual (subsecuencia común más larga sobre palabras). Las piezas
 * consecutivas del mismo tipo se agrupan.
 */
export function diffPalabras(anterior: string, actual: string): PiezaDiff[] {
  const a = tokens(anterior);
  const b = tokens(actual);
  const n = a.length;
  const m = b.length;
  // Tabla de la subsecuencia común más larga desde el final.
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const piezas: PiezaDiff[] = [];
  const agregar = (tipo: TipoCambio, texto: string) => {
    const ultima = piezas[piezas.length - 1];
    if (ultima && ultima.tipo === tipo) ultima.texto += texto;
    else piezas.push({ tipo, texto });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      agregar("igual", a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      agregar("eliminado", a[i++]);
    } else {
      agregar("agregado", b[j++]);
    }
  }
  while (i < n) agregar("eliminado", a[i++]);
  while (j < m) agregar("agregado", b[j++]);
  return piezas;
}

export function hayCambios(anterior: string | null | undefined, actual: string | null | undefined) {
  return (anterior ?? "").trim() !== (actual ?? "").trim();
}
