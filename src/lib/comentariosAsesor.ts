// Comentarios del asesor para el decanato (documento institucional "Comentarios del asesor"). Módulo puro.
import { contarPalabras } from "@/lib/reglasRegistroActividad";
import type { EjemploCampo } from "@/lib/ejemplosInforme";

export const CATEGORIAS_COMENTARIO = [
  {
    id: "retos",
    titulo: "Elementos o actividades retadores",
    pregunta: "¿Qué elementos o actividades le están resultando retadores al egresado?",
  },
  {
    id: "mejora",
    titulo: "Aspectos personales por mejorar",
    pregunta:
      "¿Qué piensa el egresado que debe mejorar personalmente (habilidades, interacción social, comportamiento) para mejorar su desempeño?",
  },
  {
    id: "ambiente",
    titulo: "Ambiente laboral e integración",
    pregunta: "¿Cómo se siente en la empresa? ¿Cuál es el ambiente laboral? ¿Cómo se ha integrado laboral y socialmente?",
  },
  {
    id: "supervisor",
    titulo: "Relación con el supervisor",
    pregunta: "¿Cómo es su relación con el supervisor? ¿Es realmente un mentor para él o ella?",
  },
  {
    id: "formacion",
    titulo: "Aportes de la formación académica",
    pregunta: "¿Qué elementos puntuales vistos en su carrera está aplicando o le están sirviendo para las actividades que desarrolla?",
  },
  {
    id: "acciones",
    titulo: "Acciones del asesor",
    pregunta: "¿Qué acciones tomará usted como asesor para apoyar al egresado en el desarrollo de esta experiencia?",
  },
] as const;

export type CategoriaComentario = (typeof CATEGORIAS_COMENTARIO)[number]["id"];

export interface ComentariosDecanato {
  respuestas: Partial<Record<CategoriaComentario, string>>;
  general?: string;
}

/** Cada pregunta requiere al menos 40 palabras; no hay máximo. */
export const COMENTARIO_MIN_PALABRAS = 40;

export const PROPOSITO_COMENTARIOS =
  'Este es un espacio de "inteligencia" para la Universidad y el Decanato. De este espacio se recaba información útil y de valor, que se usa para mejorar el perfil de los egresados e incrementar su empleabilidad.';

/** Normaliza el valor guardado en la base de datos (jsonb) a la estructura esperada. */
export function leerComentarios(valor: unknown): ComentariosDecanato {
  const v = (valor && typeof valor === "object" ? valor : {}) as Partial<ComentariosDecanato>;
  return { respuestas: v.respuestas && typeof v.respuestas === "object" ? v.respuestas : {}, general: v.general || "" };
}

/** Requisitos para aprobar el informe: cada pregunta con al menos 40 palabras; el comentario general es opcional. */
export function validarComentariosCompletos(c: ComentariosDecanato): string[] {
  const problemas: string[] = [];
  for (const cat of CATEGORIAS_COMENTARIO) {
    const n = contarPalabras(c.respuestas[cat.id] || "");
    if (n < COMENTARIO_MIN_PALABRAS) problemas.push(`${cat.titulo}: mínimo ${COMENTARIO_MIN_PALABRAS} palabras (tiene ${n}).`);
  }
  return problemas;
}

export function tieneComentarios(c: ComentariosDecanato) {
  return CATEGORIAS_COMENTARIO.some((cat) => (c.respuestas[cat.id] || "").trim().length > 0) || !!c.general?.trim();
}

export const EJEMPLO_COMENTARIOS: EjemploCampo = {
  titulo: "Ejemplo: comentarios del período 1 de ejecución de la pasantía",
  texto:
    "Como asesora en el proceso de pasantía del joven Armando Pérez, presento el informe de seguimiento correspondiente a su primer período de desempeño en la empresa, tomando como base lo expresado por el estudiante durante nuestras sesiones de acompañamiento. En lo relacionado a los retos, el joven señala que uno de los principales ha sido integrarse a la interacción directa con sistemas ya implementados y con procesos internos previamente establecidos; lo más desafiante ha sido comprender con rapidez la estructura de los módulos existentes y sus dependencias. En cuanto a los aspectos por mejorar, considera que debe fortalecer la comunicación técnica frente a frente, la seguridad al expresar dudas en persona y la gestión del tiempo. Sobre el ambiente laboral, manifiesta sentirse satisfecho y motivado en un entorno ordenado, orientado a resultados y respetuoso. Percibe al supervisor como una figura de referencia y apoyo, que le brinda retroalimentación directa. De su formación académica le han sido útiles la programación en C#, la lógica de programación, los fundamentos de cómputo en la nube y el manejo de bases de datos. Como asesora, incrementaré la comunicación con el egresado para fortalecer su comunicación técnica presencial y la gestión del tiempo.",
  nota: `Cada pregunta requiere al menos ${COMENTARIO_MIN_PALABRAS} palabras, sin límite máximo; el comentario general es opcional.`,
};

// ── Notas de seguimiento semanal: las mismas preguntas, opcionales; se acumulan en los comentarios del período ──

export interface NotaSemanal {
  semana: number;
  respuestas: Partial<Record<CategoriaComentario, string>>;
  general: string;
}

/** Lee una nota semanal; las notas anteriores (solo texto libre) se tratan como observación general. */
export function leerNotaSemanal(semana: number, respuestas: unknown, nota: string | null | undefined): NotaSemanal {
  const r = (respuestas && typeof respuestas === "object" ? respuestas : null) as
    | (Partial<Record<CategoriaComentario, string>> & { general?: string })
    | null;
  if (!r) return { semana, respuestas: {}, general: (nota || "").trim() };
  const limpias = Object.fromEntries(
    CATEGORIAS_COMENTARIO.map((c) => [c.id, (r[c.id] || "").trim()]).filter(([, t]) => t)
  ) as Partial<Record<CategoriaComentario, string>>;
  return { semana, respuestas: limpias, general: (r.general || "").trim() };
}

/** Resumen en texto de una nota semanal (bitácora y vistas que muestran un solo texto). */
export function resumenNotaSemanal(n: Omit<NotaSemanal, "semana">) {
  return [
    ...CATEGORIAS_COMENTARIO.filter((c) => n.respuestas[c.id]).map((c) => `${c.titulo}: ${n.respuestas[c.id]}`),
    ...(n.general ? [`Otras observaciones: ${n.general}`] : []),
  ].join("\n");
}

/** Une las notas semanales del período en orden, para precargar los comentarios del informe. */
export function acumularNotasSemanales(notas: NotaSemanal[]): ComentariosDecanato {
  const ordenadas = [...notas].sort((a, b) => a.semana - b.semana);
  const unir = (textos: string[]) => textos.filter(Boolean).join("\n");
  return {
    respuestas: Object.fromEntries(
      CATEGORIAS_COMENTARIO.map((c) => [c.id, unir(ordenadas.map((n) => n.respuestas[c.id] || ""))])
    ) as Partial<Record<CategoriaComentario, string>>,
    general: unir(ordenadas.map((n) => n.general)),
  };
}
