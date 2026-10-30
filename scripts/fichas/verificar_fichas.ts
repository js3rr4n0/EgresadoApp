// Comprobaciones del modelo de fichas, sin base de datos. Hace las veces de pruebas: el proyecto no tiene un
// framework de pruebas. Termina con código 1 si algo falla.
//   1. Las fichas base son válidas.
//   2. Los valores copiados de la fase 1 siguen escritos igual en el código (si alguien los cambia allá,
//      esta comprobación avisa para actualizar src/lib/fichas/fichasBase.ts).
//   3. La validación detecta los errores típicos.
// Uso: npx tsx scripts/fichas/verificar_fichas.ts
import { readFileSync } from "fs";
import path from "path";
import { definicionBase, VALORES_FASE1_COPIADOS as V } from "../../src/lib/fichas/fichasBase";
import { tieneFormaDeDefinicion, validarDefinicion } from "../../src/lib/fichas/validar";
import { compararDefiniciones } from "../../src/lib/fichas/diferencias";
import { diasSubperiodos, esEtapaEjecucion, esEtapaPropuesta, type DefinicionFicha, type Modalidad } from "../../src/lib/fichas/tipos";

let fallas = 0;
function comprobar(descripcion: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}${!ok && detalle ? ` — ${detalle}` : ""}`);
  if (!ok) fallas++;
}

const raiz = path.resolve(__dirname, "../..");
const fuente = (archivo: string) => readFileSync(path.join(raiz, archivo), "utf8");
const contiene = (archivo: string, patron: RegExp) => patron.test(fuente(archivo));

// 1. Fichas base
for (const modalidad of ["pasantia", "proyecto", "investigacion"] as Modalidad[]) {
  const problemas = validarDefinicion(definicionBase(modalidad));
  comprobar(`La ficha base de ${modalidad} es válida`, problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));
}
const pasantia = definicionBase("pasantia");
const ejecucion = pasantia.etapas.find(esEtapaEjecucion)!;
comprobar("La pasantía tiene 5 períodos de 30 días", ejecucion.periodos === 5 && ejecucion.duracionPeriodo === 30);
comprobar(
  "Los subperíodos de la pasantía son de 7, 7, 7 y 9 días",
  diasSubperiodos(ejecucion.duracionPeriodo, ejecucion.subperiodos).join(",") === "7,7,7,9"
);
comprobar(
  "Los pasos de la propuesta de pasantía coinciden con el asistente actual",
  pasantia.etapas.filter(esEtapaPropuesta)[0].espacios.map((e) => e.titulo).join(" | ") ===
    "Portada | Datos empresariales | Datos de supervisor | Carta de Aceptación | Descripción de actividades | Justificación del proceso | Documentos del estudiante"
);
comprobar("El proyecto tiene 8 pasos", definicionBase("proyecto").etapas.filter(esEtapaPropuesta)[0].espacios.length === 8);
comprobar("La investigación tiene 7 pasos", definicionBase("investigacion").etapas.filter(esEtapaPropuesta)[0].espacios.length === 7);

// 2. Valores copiados de la fase 1
comprobar(
  `La carta de pasantía sigue pidiendo ${V.diasAnticipacionCarta} días de anticipación`,
  contiene("src/components/CartaForm.tsx", new RegExp(`addDays\\(val, ${V.diasAnticipacionCarta}\\)`))
);
comprobar(
  `La carta de proyecto sigue pidiendo ${V.diasAnticipacionCarta} días de anticipación`,
  contiene("src/components/proyecto/CartaProyectoForm.tsx", new RegExp(`addDays\\(val, ${V.diasAnticipacionCarta}\\)`))
);
comprobar(
  `El primer contacto sigue venciendo a los ${V.diasPrimerContacto} días`,
  contiene("src/app/actions/informes.ts", new RegExp(`fechaLimite\\.setDate\\(fechaLimite\\.getDate\\(\\) \\+ ${V.diasPrimerContacto}\\)`))
);
comprobar(
  `El plazo de revisión sigue siendo de ${V.diasRevision} días`,
  contiene("src/app/actions/registrosActividad.ts", new RegExp(`DIAS_PLAZO_REVISION = ${V.diasRevision};`))
);
comprobar(
  `Se sigue permitiendo ${V.eliminacionesPorPeriodo} eliminación por período`,
  contiene("src/app/actions/cambiosActividad.ts", new RegExp(`MAX_ELIMINACIONES_POR_MES = ${V.eliminacionesPorPeriodo};`))
);
comprobar(
  `La visita sigue siendo requisito del informe ${V.informeRequisitoVisita}`,
  contiene("src/app/actions/informesMensuales.ts", new RegExp(`NUMERO_INFORME_VISITA = ${V.informeRequisitoVisita};`))
);
comprobar(
  `El equipo sigue siendo de máximo ${V.maxIntegrantesEquipo} integrantes`,
  contiene("src/app/actions/proyecto.ts", new RegExp(`totalCupos >= ${V.maxIntegrantesEquipo}\\)`))
);
comprobar(
  "Los objetivos específicos siguen siendo de 4 a 6",
  contiene("src/app/actions/proyecto.ts", /objetivosEspecificos\.length < 4 \|\| data\.objetivosEspecificos\.length > 6/)
);

// 3. La validación detecta errores típicos
function conCambio(cambiar: (d: DefinicionFicha) => void): string[] {
  const d = definicionBase("pasantia");
  cambiar(d);
  return validarDefinicion(d).map((p) => p.mensaje);
}
const propuesta = (d: DefinicionFicha) => d.etapas.filter(esEtapaPropuesta)[0];
const ejec = (d: DefinicionFicha) => d.etapas.filter(esEtapaEjecucion)[0];
const detecta = (descripcion: string, mensajes: string[], parte: string) =>
  comprobar(`Detecta: ${descripcion}`, mensajes.some((m) => m.includes(parte)), mensajes.join(" | ") || "sin problemas");

detecta("supervisor antes de la empresa", conCambio((d) => propuesta(d).espacios.reverse()), "debe ir después de");
detecta("elemento no disponible en la modalidad", conCambio((d) => {
  propuesta(d).espacios.push({ ...propuesta(d).espacios[0], id: "obj", elemento: "objetivos", titulo: "Objetivos", parametros: { minEspecificos: 4, maxEspecificos: 6 } });
}), "no está disponible");
detecta("elemento no repetible duplicado", conCambio((d) => propuesta(d).espacios.push({ ...propuesta(d).espacios[0], id: "portada2" })), "solo puede aparecer una vez");
detecta("parámetro fuera de rango", conCambio((d) => { propuesta(d).espacios.find((e) => e.elemento === "cronograma")!.parametros.minActividadesPeriodo = 0; }), "debe estar entre");
detecta("carta y ejecución con duraciones distintas", conCambio((d) => { ejec(d).periodos = 4; }), "no coincide");
detecta("hito fuera de la etapa", conCambio((d) => { ejec(d).hitos.find((h) => h.id === "visita")!.hasta = 400; }), "termina después del fin");
detecta("cronograma sin ejecución", conCambio((d) => { d.etapas = d.etapas.filter(esEtapaPropuesta); }), "necesita una etapa de ejecución");
detecta("responsable por actividad en trabajo individual", conCambio((d) => {
  propuesta(d).espacios.find((e) => e.elemento === "cronograma")!.parametros.responsablePorActividad = true;
}), "solo aplica a trabajos en equipo");

// 4. Comparación entre versiones (resumen que se muestra al habilitar)
comprobar("Dos definiciones iguales no tienen cambios", compararDefiniciones(definicionBase("pasantia"), definicionBase("pasantia")).length === 0);
{
  const nueva = definicionBase("pasantia");
  ejec(nueva).periodos = 4;
  propuesta(nueva).espacios.splice(5, 1);
  const cambios = compararDefiniciones(definicionBase("pasantia"), nueva);
  comprobar("Detecta un espacio quitado", cambios.some((c) => c.includes('Se quitó el espacio "Justificación del proceso"')), cambios.join(" | "));
  comprobar("Detecta un cambio en la ejecución", cambios.some((c) => c.includes("períodos, 5 → 4")), cambios.join(" | "));
}
comprobar("Una definición mal formada se rechaza", !tieneFormaDeDefinicion({ formato: 1, modalidad: "pasantia", etapas: "x" }));
comprobar("Las fichas base tienen la forma esperada", (["pasantia", "proyecto", "investigacion"] as Modalidad[]).every((m) => tieneFormaDeDefinicion(definicionBase(m))));

console.log(fallas === 0 ? "\nTodo en orden." : `\n${fallas} comprobación(es) fallaron.`);
process.exit(fallas === 0 ? 0 : 1);
