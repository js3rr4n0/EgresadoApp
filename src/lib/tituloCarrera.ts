// Título académico al que se opta, a partir del nombre de la carrera (recorrido integral, H13). La tabla de carreras no
// guarda el título, así que se deduce del grado: "Ingeniería en Sistemas" → "Ingeniero(a) en Sistemas". Si el nombre no
// empieza con un grado conocido, se muestra tal cual. Módulo puro.

const GRADOS: [RegExp, string][] = [
  [/^ingenier[ií]a\b/i, "Ingeniero(a)"],
  [/^licenciatura\b/i, "Licenciado(a)"],
  [/^arquitectura\b/i, "Arquitecto(a)"],
  [/^doctorado\b/i, "Doctor(a)"],
  [/^maestr[ií]a\b/i, "Maestro(a)"],
  [/^profesorado\b/i, "Profesor(a)"],
  [/^t[eé]cnico\b/i, "Técnico(a)"],
];

export function tituloDeCarrera(carrera: string | null | undefined): string | null {
  const nombre = carrera?.trim();
  if (!nombre) return null;
  for (const [patron, titulo] of GRADOS) {
    if (patron.test(nombre)) return nombre.replace(patron, titulo);
  }
  return nombre;
}
