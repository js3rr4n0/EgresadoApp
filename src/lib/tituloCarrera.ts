// Título académico al que se opta (recorrido integral, H13). Es el título que la carrera tiene registrado
// (carreras.titulo, cargado con scripts/cargar_facultades_carreras.ts). Si una carrera aún no lo tiene, se deduce del
// grado: "Ingeniería en Sistemas" → "Ingeniero(a) en Sistemas"; si el nombre no empieza con un grado conocido, se
// muestra tal cual. Módulo puro.

const GRADOS: [RegExp, string][] = [
  [/^ingenier[ií]a\b/i, "Ingeniero(a)"],
  [/^licenciatura\b/i, "Licenciado(a)"],
  [/^arquitectura\b/i, "Arquitecto(a)"],
  [/^doctorado\b/i, "Doctor(a)"],
  [/^maestr[ií]a\b/i, "Maestro(a)"],
  [/^profesorado\b/i, "Profesor(a)"],
  [/^t[eé]cnico\b/i, "Técnico(a)"],
];

export function tituloDeCarrera(carrera: string | null | undefined, registrado?: string | null): string | null {
  if (registrado?.trim()) return registrado.trim();
  const nombre = carrera?.trim();
  if (!nombre) return null;
  for (const [patron, titulo] of GRADOS) {
    if (patron.test(nombre)) return nombre.replace(patron, titulo);
  }
  return nombre;
}
