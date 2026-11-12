// Textos de las pantallas compartidas por proyecto e investigación (plan, ejecución, informes), según la modalidad
// de la propuesta (entrega I4). Módulo puro.
export function textosModalidad(tipo: string | null | undefined) {
  const inv = tipo === "investigacion";
  return {
    /** "proyecto" | "investigación" */
    nombre: inv ? "investigación" : "proyecto",
    /** "Proyecto" | "Investigación" */
    Nombre: inv ? "Investigación" : "Proyecto",
    /** "el proyecto" | "la investigación" */
    el: inv ? "la investigación" : "el proyecto",
    /** "del proyecto" | "de la investigación" */
    del: inv ? "de la investigación" : "del proyecto",
    /** "En proyecto" | "En investigación" */
    En: inv ? "En investigación" : "En proyecto",
    esInvestigacion: inv,
  };
}
