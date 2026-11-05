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
import { diasSubperiodos, esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, opcionesRegistro, type DefinicionFicha, type Modalidad } from "../../src/lib/fichas/tipos";
import { ejecucionNueva, planNuevo } from "../../src/lib/fichas/plantillas";
import { aplanar, cambioNoPermitido, cargaPorIntegrante, numerar, planEjemplo, planIndividual, totalesNodo, validarPlanEquipo, type NodoPlan } from "../../src/lib/fichas/planTrabajo";

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
  contiene("src/app/actions/proyecto.ts", new RegExp(`MAX_INTEGRANTES_EQUIPO = ${V.maxIntegrantesEquipo};`))
);
comprobar(
  "Los objetivos específicos siguen siendo de 4 a 6",
  contiene("src/app/actions/proyecto.ts", /OBJETIVOS_FASE1 = \{ min: 4, max: 6 \}/)
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

// 5. Ficha de proyecto completa: plan de trabajo y ejecución en equipo (entrega P1)
function proyectoCompleto(): DefinicionFicha {
  const d = definicionBase("proyecto");
  const [prop] = d.etapas;
  d.etapas = [prop, planNuevo("plan"), ejecucionNueva("ejecucion", "proyecto", 1, true)];
  // La carta de la base dura 150 días: 5 períodos de 30.
  return d;
}
{
  const d = proyectoCompleto();
  const problemas = validarDefinicion(d);
  comprobar("La ficha de proyecto con plan y ejecución es válida", problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));
  comprobar("La ficha de proyecto completa tiene la forma esperada", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))));
  const et = ejec(d);
  const op = opcionesRegistro(et);
  comprobar("La ejecución de proyecto no aplica métrica", et.informe.paginasMinimas === 0 && et.registro.imagenes === 0 && op.marcoTeorico === "opcional");
  comprobar("La ejecución de proyecto registra por actividad e informa por integrante", op.modo === "actividad" && op.informe === "individual_y_general");
  comprobar("Las versiones guardadas antes se leen como pasantía", opcionesRegistro(ejec(definicionBase("pasantia"))).modo === "subperiodo");
}
function proyectoConCambio(cambiar: (d: DefinicionFicha) => void): string[] {
  const d = proyectoCompleto();
  cambiar(d);
  return validarDefinicion(d).map((p) => p.mensaje);
}
detecta("plan sin objetivos en la propuesta", proyectoConCambio((d) => { propuesta(d).espacios = propuesta(d).espacios.filter((e) => e.elemento !== "objetivos"); }), "agrega el espacio \"Objetivos\"");
detecta("plan sin ejecución", proyectoConCambio((d) => { d.etapas = d.etapas.filter((e) => !esEtapaEjecucion(e)); }), "plan de trabajo necesita una etapa de ejecución");
detecta("plan después de la ejecución", proyectoConCambio((d) => { d.etapas = [d.etapas[0], d.etapas[2], d.etapas[1]]; }), "inmediatamente después de la propuesta");
detecta("plan en una pasantía", conCambio((d) => { d.etapas.splice(1, 0, planNuevo("plan")); }), "el plan de trabajo es para proyecto");
detecta("registro por actividad sin plan", proyectoConCambio((d) => { d.etapas = d.etapas.filter((e) => !esEtapaPlan(e)); }), "necesita un plan de trabajo");
detecta("mínimo de objetivos fuera de rango", proyectoConCambio((d) => { d.etapas.find(esEtapaPlan)!.minimos.objetivosPorIntegrante = 0; }), "objetivos específicos por integrante");
{
  const anterior = proyectoCompleto();
  const nueva = proyectoCompleto();
  nueva.etapas.find(esEtapaPlan)!.equipo.responsable = "actividad";
  const cambios = compararDefiniciones(anterior, nueva);
  comprobar("Detecta un cambio en el plan de trabajo", cambios.some((c) => c.includes("Plan de trabajo: responsable")), cambios.join(" | "));
}

// 6. Sumas del plan, plan individual y carga por integrante
{
  const plan = planNuevo("plan");
  const columnas = 8;
  const raiz = planEjemplo(plan, 3, columnas);
  const total = (n: NodoPlan) => totalesNodo(n, columnas).reduce((a, b) => a + b, 0);
  const hojas = aplanar(raiz).filter((n) => n.hijos.length === 0);
  const sumaHojas = hojas.reduce((a, n) => a + n.montos.reduce((x, y) => x + y, 0), 0);
  comprobar("El objetivo general suma los montos de todas las actividades", total(raiz) === sumaHojas && sumaHojas > 0);
  comprobar("Cada nivel suma los de sus hijos", aplanar(raiz).filter((n) => n.hijos.length > 0).every((n) => total(n) === n.hijos.reduce((a, h) => a + total(h), 0)));
  const carga = cargaPorIntegrante(raiz, 3, columnas);
  comprobar("Con responsable por objetivo, cada integrante tiene sus 3 objetivos", carga.every((c) => c.objetivos === 3), JSON.stringify(carga));
  comprobar("Los planes individuales suman el plan general", carga.reduce((a, c) => a + c.monto, 0) === total(raiz));
  const individual = planIndividual(raiz, 2)!;
  comprobar("El plan individual conserva el objetivo general (consecuencia lógica)", individual.nivel === 1 && individual.hijos.every((o) => o.responsable === 2));
  const porActividad = planEjemplo({ ...plan, equipo: { ...plan.equipo, responsable: "actividad" } }, 3, columnas);
  const cargaAct = cargaPorIntegrante(porActividad, 3, columnas);
  comprobar("Con responsable por actividad, todos tienen actividades", cargaAct.every((c) => c.actividades > 0), JSON.stringify(cargaAct));
}

// 7. Plan real del equipo (P3): validación contra la ficha y permisos por integrante
{
  const plan = planNuevo("plan");
  const cols = 8;
  // Ejemplo con ids de usuario 11, 12 y 13 como responsables.
  const conIds = (n: NodoPlan): NodoPlan => ({ ...n, responsable: n.responsable ? n.responsable + 10 : null, hijos: n.hijos.map(conIds) });
  const raiz = numerar(conIds(planEjemplo(plan, 3, cols)));
  const ids = [11, 12, 13];
  const problemas = validarPlanEquipo(raiz, plan, ids, cols);
  comprobar("Un plan completo del equipo no tiene pendientes", problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));

  const sinResp = structuredClone(raiz);
  sinResp.hijos[0].responsable = null;
  comprobar("Detecta un objetivo sin responsable", validarPlanEquipo(sinResp, plan, ids, cols).some((p) => p.mensaje.includes("falta el integrante responsable")));
  const sinMontos = structuredClone(raiz);
  sinMontos.hijos[0].hijos[0].hijos[0].montos = [];
  comprobar("Detecta una actividad sin columnas", validarPlanEquipo(sinMontos, plan, ids, cols).some((p) => p.mensaje.includes("al menos un")));
  const pocos = structuredClone(raiz);
  pocos.hijos = pocos.hijos.filter((o) => o.responsable !== 13 || o.codigo !== "1.7");
  comprobar("Detecta un integrante con menos objetivos del mínimo", validarPlanEquipo(numerar(pocos), plan, ids, cols).some((p) => p.mensaje.includes("al menos 3 objetivos")));

  // Permisos: el integrante 12 cambia lo suyo (permitido) y lo de otro (no permitido).
  const propio = structuredClone(raiz);
  const suyo = propio.hijos.find((o) => o.responsable === 12)!;
  suyo.hijos[0].hijos[0].titulo = "Actividad cambiada";
  suyo.hijos[0].hijos.push({ id: "nueva", codigo: "", nivel: 4, titulo: "Nueva", responsable: null, montos: [50], hijos: [] });
  comprobar("Un integrante puede cambiar y ampliar lo suyo", cambioNoPermitido(raiz, numerar(propio), 12) === null, String(cambioNoPermitido(raiz, numerar(propio), 12)));
  const ajeno = structuredClone(raiz);
  ajeno.hijos.find((o) => o.responsable === 11)!.titulo = "Cambio ajeno";
  comprobar("Un integrante no puede cambiar lo de otro", cambioNoPermitido(raiz, ajeno, 12) !== null);
  const reasigna = structuredClone(raiz);
  reasigna.hijos.find((o) => o.responsable === 12)!.responsable = 13;
  comprobar("Un integrante no puede reasignar responsables", cambioNoPermitido(raiz, reasigna, 12) !== null);
}

console.log(fallas === 0 ? "\nTodo en orden." : `\n${fallas} comprobación(es) fallaron.`);
process.exit(fallas === 0 ? 0 : 1);
