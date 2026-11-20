// Una carrera pertenece a una facultad y puede ofrecerse también en otras sedes (por ejemplo, la Facultad
// Multidisciplinaria de Ilobasco) sin duplicarse: tabla carreras_sedes. Módulo puro.

export interface CarreraConSedes {
  facultadId?: number | null;
  /** Otras facultades o sedes donde también se ofrece. */
  sedes?: number[];
}

/** ¿La carrera se ofrece en esa facultad (la suya o una sede)? Sin facultad elegida, todas. */
export function seOfreceEn(c: CarreraConSedes, facultadId: number | string | null | undefined): boolean {
  if (facultadId === null || facultadId === undefined || facultadId === "") return true;
  const id = Number(facultadId);
  return c.facultadId === id || (c.sedes ?? []).includes(id);
}

/** Agrupa las filas de carreras_sedes por carrera. */
export function sedesPorCarrera(filas: { carreraId: number; facultadId: number }[]): Map<number, number[]> {
  const m = new Map<number, number[]>();
  for (const f of filas) m.set(f.carreraId, [...(m.get(f.carreraId) ?? []), f.facultadId]);
  return m;
}
