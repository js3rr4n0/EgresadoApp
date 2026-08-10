export function getRequiredDocsForTipo(tipo?: string) {
  const cleanTipo = (tipo || "").toLowerCase().trim();
  if (cleanTipo.includes("proyecto") || cleanTipo.includes("investigac")) {
    return [
      { tipo: "propuesta_aceptada", label: "Propuesta Aceptada / Modificada" },
      { tipo: "dictamen_plan_trabajo", label: "Dictamen de Plan de Trabajo (Objetivos)" },
      { tipo: "dictamen_propuesta", label: "Dictamen de Propuesta" },
    ];
  }
  // Pasantía or default (4 documents)
  return [
    { tipo: "propuesta_aceptada", label: "Propuesta Aceptada / Modificada" },
    { tipo: "plan_trabajo_firmado", label: "Plan de Trabajo Firmado" },
    { tipo: "dictamen_plan_trabajo", label: "Dictamen de Plan de Trabajo" },
    { tipo: "dictamen_propuesta", label: "Dictamen de Propuesta" },
  ];
}
