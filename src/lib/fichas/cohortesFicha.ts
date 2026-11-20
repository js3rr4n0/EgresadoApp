// Qué versión de ficha usa cada cohorte (reunión del 20-nov-2026, H1 y H11; la "entrega 3" de ENTREGA_1.md).
// Al habilitar una versión se marcan las cohortes que la usan. Una propuesta nueva toma, entre las versiones
// habilitadas que alcanzan al egresado (por carrera, facultad o todas):
//   1. las ligadas a su cohorte;
//   2. si no hay, las que no están ligadas a ninguna cohorte (sirven para todas);
//   3. si tampoco hay, cualquiera de las que lo alcanzan, para no dejar al egresado sin ficha.
// Dentro de cada grupo gana el alcance más específico (carrera, luego facultad, luego todas) y, a igual alcance, la
// habilitada más recientemente (H11: antes ganaba el número de versión más alto, aunque fuera de otra ficha).
// Una propuesta ya creada conserva su versión: cambiar las cohortes no la mueve. Módulo puro.

export interface VersionCandidata {
  id: number;
  /** 3 = de su carrera, 2 = de su facultad, 1 = de todas, -1 = no lo alcanza. */
  nivel: number;
  habilitadaEn: Date | string | null;
  /** Ids de las cohortes (periodos) ligadas a la versión; vacío = sin cohortes. */
  cohortes: number[];
}

const tiempo = (d: Date | string | null) => (d ? new Date(d).getTime() : 0);

export function elegirVersion(candidatas: VersionCandidata[], cohorteId: number | null): number | null {
  const alcanzan = candidatas.filter((c) => c.nivel > 0);
  const orden = (a: VersionCandidata, b: VersionCandidata) => b.nivel - a.nivel || tiempo(b.habilitadaEn) - tiempo(a.habilitadaEn) || b.id - a.id;
  const grupos = [
    cohorteId != null ? alcanzan.filter((c) => c.cohortes.includes(cohorteId)) : [],
    alcanzan.filter((c) => c.cohortes.length === 0),
    alcanzan,
  ];
  for (const g of grupos) if (g.length) return [...g].sort(orden)[0].id;
  return null;
}

/** Cohortes que pasan de otra versión de la misma ficha a la que se habilita (para avisar antes de confirmar). */
export function cohortesQueSeMueven(
  elegidas: number[],
  otras: { numero: number; estado: string; cohortes: number[] }[]
): { cohorteId: number; deVersion: number }[] {
  return elegidas.flatMap((id) => {
    const v = otras.find((o) => o.estado === "habilitada" && o.cohortes.includes(id));
    return v ? [{ cohorteId: id, deVersion: v.numero }] : [];
  });
}
