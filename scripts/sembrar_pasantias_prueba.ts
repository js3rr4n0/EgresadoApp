// Siembra pasantías de prueba completas (fase de inicio, cronograma, actividades, revisión del asesor, informes y visita).
// Uso: npx tsx --env-file=.env.local scripts/sembrar_pasantias_prueba.ts [a|b|todos]
// Es idempotente: elimina primero los usuarios sembrados (por correo) y todo lo que depende de ellos.
import { readFileSync } from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { eq, inArray, sql } from "drizzle-orm";
import {
  actividades,
  bitacoraEventos,
  cartasAceptacion,
  historialEstados,
  imagenesActividad,
  informesMensuales,
  informesPrimerContacto,
  informesVisita,
  notasSeguimientoAsesor,
  notificaciones,
  periodos,
  propuestas,
  registrosActividad,
  solicitudesAsesor,
  solicitudesCambioActividad,
  usuarios,
} from "../src/lib/schema";
import sharp from "sharp";
import { generarPeriodosPasantia, fechaLocalDesdeISO, aISOLocal, nombreInforme } from "../src/lib/periodosPasantia";
import { textoCitaApa } from "../src/lib/citaApa";
import { validarContenidoRegistro } from "../src/lib/reglasRegistroActividad";
import { validarComentariosCompletos, resumenNotaSemanal } from "../src/lib/comentariosAsesor";
import { validarOrigenImagen } from "../src/lib/fuenteImagen";
import {
  SECCIONES_VISITA,
  preguntaVisible,
  seccionVisible,
  requiereExplicacion,
  idExplicacion,
  validarInformeVisita,
  type Respuestas,
} from "../src/lib/formularioVisita";
import {
  CRONOGRAMA_CREDITOS,
  CRONOGRAMA_HOSPITAL,
  MARCOS,
  MARCOS_POR_PERIODO,
  DESCRIPCIONES,
  CONCLUSIONES,
  comentariosDecanato,
  notaSemanal,
} from "./datos_pasantias_prueba";

const ASESOR_ID = 39;
const COORDINADOR_ID = 38;
const ADMIN_ID = 1;
const EGRESADO_PLANTILLA_ID = 40; // de aquí se copian la contraseña de demostración y los documentos de la fase de inicio
const PROPUESTA_PLANTILLA_ID = 40;

// Imagen de ejemplo recortada en cuadro (como la deja el recortador); ruta en IMAGEN_PRUEBA.
const IMAGEN = `data:image/png;base64,${readFileSync(process.env.IMAGEN_PRUEBA || path.join(process.cwd(), "images", "2.png")).toString("base64")}`;

const filas = <T = any>(r: unknown) => ((r as any).rows ?? r) as T[];

/** Fecha ISO + días. */
function mas(iso: string, dias: number) {
  const d = fechaLocalDesdeISO(iso);
  d.setDate(d.getDate() + dias);
  return aISOLocal(d);
}
/** Instante en hora de El Salvador (UTC-6). */
function en(iso: string, hora: string) {
  return new Date(`${iso}T${hora}:00-06:00`);
}

interface ConfigPasantia {
  clave: "a" | "b";
  nombre: string;
  primerNombre: string;
  correo: string;
  carnet: string;
  cohorte: { id?: number; nombre: string };
  inicio: string;
  empresaId: number;
  supervisorId: number;
  titulo: string;
  justificacion: string;
  cronograma: string[][][];
  /** Semanas aprobadas por el asesor, en orden (p. ej. 20 = todo el cronograma). */
  semanasAprobadas: number;
  informesAprobados: number;
  /** Cambios aprobados al cronograma (actividad eliminada, agregada, modificada y pospuesta) para los anexos del informe final. */
  cambiosCronograma?: boolean;
}

const PASANTIA_A: ConfigPasantia = {
  clave: "a",
  nombre: "Andrea Sofía Martínez López",
  primerNombre: "Andrea",
  correo: "andrea.martinez@catolica.edu.sv",
  carnet: "2021ML502",
  cohorte: { nombre: "C1-2026" },
  inicio: "2026-04-13",
  empresaId: 22,
  supervisorId: 23,
  titulo: "Sistema de gestión de créditos y cobros para la Caja de Crédito de Santa Ana",
  justificacion: [
    "La Caja de Crédito de Santa Ana atiende a más de cuatro mil asociados y administra cada mes alrededor de trescientas solicitudes de crédito. Actualmente el registro de solicitudes, el cálculo de cuotas y el seguimiento de la cartera se realizan en hojas de cálculo independientes que mantiene cada analista, lo que provoca información duplicada, errores de digitación y demoras en la respuesta a los asociados.",
    "El área de cobros no cuenta con una vista consolidada de la cartera vencida: los gestores elaboran sus listados de forma manual y la jefatura recibe los reportes de mora con varios días de retraso, lo que limita la toma de decisiones oportunas y aumenta el riesgo crediticio de la institución.",
    "Por ello se propone desarrollar un sistema web de gestión de créditos y cobros que centralice el registro de solicitudes, automatice el cálculo de cuotas y de mora, asigne la cartera a los gestores y genere reportes gerenciales confiables. El proyecto permitirá al pasante aplicar sus conocimientos de ingeniería de software en un entorno real y dejará a la institución una herramienta que mejora la calidad de su servicio.",
  ].join("\n\n"),
  cronograma: CRONOGRAMA_CREDITOS,
  semanasAprobadas: 20,
  informesAprobados: 5,
  cambiosCronograma: true,
};

const PASANTIA_B: ConfigPasantia = {
  clave: "b",
  nombre: "Kevin Alexander Rivas Portillo",
  primerNombre: "Kevin",
  correo: "kevin.rivas@catolica.edu.sv",
  carnet: "2021RP318",
  cohorte: { id: 6, nombre: "C2-2026" },
  inicio: "2026-09-07",
  empresaId: 23,
  supervisorId: 24,
  titulo: "Sistema de citas médicas y expediente clínico electrónico para el Hospital Centro Médico de Santa Ana",
  justificacion: [
    "El Hospital Centro Médico de Santa Ana programa diariamente más de ciento cincuenta citas de consulta externa mediante llamadas telefónicas y una agenda en papel por especialidad. Esta forma de trabajo provoca citas duplicadas, tiempos de espera prolongados y dificultad para reprogramar a los pacientes cuando un médico no puede atender.",
    "Los expedientes clínicos se archivan en físico, por lo que el médico no siempre dispone de los antecedentes del paciente durante la consulta y la información de diagnósticos y recetas no puede consultarse de forma oportuna ni analizarse para la toma de decisiones de la dirección médica.",
    "Se propone desarrollar un sistema de citas médicas y expediente clínico electrónico que centralice la agenda, registre la atención de cada consulta y permita al paciente consultar sus citas y resultados. El proyecto mejorará la calidad de la atención y permitirá al pasante aplicar sus conocimientos de ingeniería de software en un entorno real.",
  ].join("\n\n"),
  cronograma: CRONOGRAMA_HOSPITAL,
  semanasAprobadas: 4,
  informesAprobados: 1,
};

// ── Limpieza ──

async function eliminarSembrado(correo: string) {
  const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, correo));
  if (!u) return;
  const props = await db.select({ id: propuestas.id }).from(propuestas).where(eq(propuestas.egresadoId, u.id));
  if (props.length) await db.delete(propuestas).where(inArray(propuestas.id, props.map((p) => p.id)));
  await db.delete(usuarios).where(eq(usuarios.id, u.id));
  console.log(`  Eliminado el usuario sembrado anterior (${correo}).`);
}

// ── Cohorte ──

async function asegurarCohorte(c: ConfigPasantia) {
  if (c.cohorte.id) return c.cohorte.id;
  const [existe] = await db.select({ id: periodos.id }).from(periodos).where(eq(periodos.nombre, c.cohorte.nombre));
  if (existe) return existe.id;
  const [nueva] = await db
    .insert(periodos)
    .values({
      nombre: c.cohorte.nombre,
      inicioRecepcion: "2026-02-02",
      finRecepcion: "2026-03-02",
      maxAprobacionPropuesta: "2026-03-23",
      maxInicioProceso: "2026-04-15",
      maxPrimerInforme: "2026-05-20",
      maxSegundoInforme: "2026-06-20",
      maxTercerInforme: "2026-07-20",
      maxCuartoInforme: "2026-08-20",
      visitaAsesorInicio: "2026-06-20",
      visitaAsesorFin: "2026-07-25",
      maxInformeFinal: "2026-09-20",
      maxAprobacionFinal: "2026-10-20",
      activo: false,
    })
    .returning({ id: periodos.id });
  console.log(`  Cohorte ${c.cohorte.nombre} creada (id ${nueva.id}).`);
  return nueva.id;
}

// ── Fase de inicio: usuario, documentos, propuesta, asesor, carta, primer contacto, aprobación del plan ──

async function faseInicio(c: ConfigPasantia, periodoId: number) {
  const [plantilla] = await db
    .select({ passwordHash: usuarios.passwordHash })
    .from(usuarios)
    .where(eq(usuarios.id, EGRESADO_PLANTILLA_ID));
  const [u] = await db
    .insert(usuarios)
    .values({
      nombreCompleto: c.nombre,
      correo: c.correo,
      passwordHash: plantilla.passwordHash,
      rol: "egresado",
      carnet: c.carnet,
      carreraId: 1,
      facultadId: 1,
      cohorte: c.cohorte.nombre,
    })
    .returning({ id: usuarios.id });

  const t0 = mas(c.inicio, -28); // documentos y redacción de la propuesta, cuatro semanas antes del inicio
  // Documentos del egresado (servicio social, notas, pago): se copian los PDF de demostración.
  await db.execute(sql`
    INSERT INTO documentos_egresado (egresado_id, tipo, archivo_url, subido_en)
    SELECT ${u.id}, tipo, archivo_url, ${en(t0, "09:00")} FROM documentos_egresado WHERE egresado_id = ${EGRESADO_PLANTILLA_ID}`);

  const [p] = await db
    .insert(propuestas)
    .values({
      egresadoId: u.id,
      periodoId,
      tipo: "pasantia",
      numero: 1,
      estado: "en_ejecucion",
      empresaId: c.empresaId,
      supervisorId: c.supervisorId,
      justificacionProceso: c.justificacion,
      asesorId: ASESOR_ID,
      coordinadorId: COORDINADOR_ID,
      titulo: c.titulo,
      enviadaEn: en(mas(t0, 2), "10:30"),
      fechaAprobacion: en(mas(t0, 9), "11:00"),
    })
    .returning({ id: propuestas.id });

  // Documentos de la propuesta: revisiones del egresado y documentos firmados (se copian los PDF de demostración).
  await db.execute(sql`
    INSERT INTO documentos_propuesta (propuesta_id, tipo, archivo_url, nombre_archivo, subido_en)
    SELECT ${p.id}, CASE WHEN tipo LIKE 'pdf_revisado_%' THEN 'pdf_revisado_' || (extract(epoch from ${en(mas(t0, 2), "10:30")}::timestamptz) * 1000 + id)::bigint ELSE tipo END,
           CASE WHEN tipo LIKE 'pdf_revisado_%' THEN '/egresado/redactar/imprimir?id=' || ${p.id} ELSE archivo_url END,
           CASE WHEN tipo LIKE 'pdf_revisado_%' THEN 'Propuesta_Revisada_' || ${p.id} || '.pdf' ELSE nombre_archivo END,
           ${en(mas(t0, 12), "15:00")}
    FROM documentos_propuesta WHERE propuesta_id = ${PROPUESTA_PLANTILLA_ID}`);

  await db.insert(solicitudesAsesor).values({
    propuestaId: p.id,
    asesorId: ASESOR_ID,
    coordinadorId: COORDINADOR_ID,
    estado: "aceptada",
    creadaEn: en(mas(t0, 4), "08:30"),
    respondidoEn: en(mas(t0, 4), "14:00"),
  });

  // Carta de aceptación (se copia el PDF y la firma de demostración con las fechas de esta pasantía).
  await db.execute(sql`
    INSERT INTO cartas_aceptacion (propuesta_id, archivo_url, fecha_emision, fecha_inicio, fecha_fin, emisor_nombre, emisor_cargo, emisor_firma_url, bloqueada)
    SELECT ${p.id}, archivo_url, ${mas(c.inicio, -14)}, ${c.inicio}, ${mas(c.inicio, 149)}, emisor_nombre, emisor_cargo, emisor_firma_url, true
    FROM cartas_aceptacion WHERE propuesta_id = ${PROPUESTA_PLANTILLA_ID}`);

  // Primer contacto del asesor con la empresa (con la evidencia de demostración).
  const [ipc] = filas<{ id: number }>(
    await db.execute(sql`
    INSERT INTO informes_primer_contacto (propuesta_id, asesor_id, supervisor_id, estado, fecha_limite, enviado_en, cumplimiento, desviacion_dias,
      contacto_previo, fecha_cita, modalidad_cita, evidencia_urls, objetivos_entrevista, mecanismos_comunicacion, acepta_informes_mensuales,
      resultado_validacion, creado_en, actualizado_en)
    SELECT ${p.id}, ${ASESOR_ID}, ${c.supervisorId}, 'enviado', ${en(mas(t0, 16), "14:00")}, ${en(mas(t0, 11), "16:00")}, 'a_tiempo', -5,
      false, ${mas(t0, 10)}, 'visita_fisica', evidencia_urls, objetivos_entrevista, mecanismos_comunicacion, true,
      'aprobada', ${en(mas(t0, 9), "14:00")}, ${en(mas(t0, 11), "16:00")}
    FROM informes_primer_contacto WHERE propuesta_id = ${PROPUESTA_PLANTILLA_ID}
    RETURNING id`)
  );
  await db.execute(sql`
    INSERT INTO evidencias_informe_primer_contacto (informe_id, nombre_archivo, archivo_url, subido_en)
    SELECT ${ipc.id}, e.nombre_archivo, e.archivo_url, ${en(mas(t0, 11), "15:50")}
    FROM evidencias_informe_primer_contacto e JOIN informes_primer_contacto i ON i.id = e.informe_id
    WHERE i.propuesta_id = ${PROPUESTA_PLANTILLA_ID}`);

  await db.insert(historialEstados).values([
    { propuestaId: p.id, de: "enviada", a: "coordinador_asignado", usuarioId: ADMIN_ID, creadoEn: en(mas(t0, 3), "09:00") },
    { propuestaId: p.id, de: "coordinador_asignado", a: "solicitud_asesor_enviada", usuarioId: COORDINADOR_ID, creadoEn: en(mas(t0, 4), "08:30") },
    { propuestaId: p.id, de: "coordinador_asignado", a: "ajustes_solicitados", usuarioId: ASESOR_ID, creadoEn: en(mas(t0, 6), "10:00") },
    { propuestaId: p.id, de: "redactando", a: "ajustes_completados", usuarioId: u.id, creadoEn: en(mas(t0, 8), "17:00") },
    { propuestaId: p.id, de: "coordinador_asignado", a: "aprobada", usuarioId: ASESOR_ID, creadoEn: en(mas(t0, 9), "11:00") },
    { propuestaId: p.id, de: "aprobada", a: "primer_contacto_completado", usuarioId: ASESOR_ID, creadoEn: en(mas(t0, 11), "16:00") },
    { propuestaId: p.id, de: "primer_contacto_completado", a: "en_ejecucion", usuarioId: COORDINADOR_ID, creadoEn: en(mas(t0, 13), "09:30") },
  ]);

  return { usuarioId: u.id, propuestaId: p.id };
}

// ── Cronograma y contenido de las actividades ──

interface SemanaPlan {
  periodo: number;
  semana: number;
  inicio: string;
  fin: string;
  enviadaEl: string;
  revisadaEl: string;
}

function planSemanas(inicio: string): SemanaPlan[] {
  const plan: SemanaPlan[] = [];
  for (const p of generarPeriodosPasantia(fechaLocalDesdeISO(inicio))) {
    const ini = aISOLocal(p.inicio);
    const fin = aISOLocal(p.fin);
    for (let s = 1; s <= 4; s++) {
      const sIni = mas(ini, (s - 1) * 7);
      const sFin = s === 4 ? fin : mas(sIni, 6);
      // Se envía al quinto día de la semana (la cuarta, tres días antes del cierre del período) y se revisa dos días después.
      const enviadaEl = s === 4 ? mas(fin, -3) : mas(sIni, 4);
      plan.push({ periodo: p.num, semana: s, inicio: sIni, fin: sFin, enviadaEl, revisadaEl: mas(enviadaEl, 2) });
    }
  }
  return plan;
}

function contenido(c: ConfigPasantia, periodo: number, semana: number, numero: number, titulo: string) {
  const idx = (semana - 1) * 4 + (numero - 1);
  const marco = MARCOS[MARCOS_POR_PERIODO[periodo - 1][idx % MARCOS_POR_PERIODO[periodo - 1].length]];
  const actividad = titulo.charAt(0).toLowerCase() + titulo.slice(1);
  const sustituir = (t: string) => t.replace(/\{actividad\}/g, actividad).replace(/\{proyecto\}/g, `«${c.titulo}»`);
  return {
    marcoTeorico: marco.texto,
    citaApaDatos: marco.cita,
    citaApa: textoCitaApa(marco.cita),
    descriptor: DESCRIPCIONES[(idx + periodo) % DESCRIPCIONES.length].map(sustituir).join("\n"),
    conclusionTecnica: sustituir(CONCLUSIONES[(idx + periodo) % CONCLUSIONES.length]),
    imagenUrl: IMAGEN,
    leyendaImagen: `Evidencia de la actividad: ${actividad}`.slice(0, 250),
    imagenOrigen: "propia",
    imagenFuente: null,
  };
}

const FUENTE_EXTERNA = {
  uso: "adaptada" as const,
  autor: "Object Management Group",
  anio: "2011",
  titulo: "Business Process Model and Notation (BPMN) Version 2.0",
  sitio: "Object Management Group",
  url: "https://www.omg.org/spec/BPMN/2.0/",
};

async function sembrarCronograma(c: ConfigPasantia, ids: { usuarioId: number; propuestaId: number }) {
  const plan = planSemanas(c.inicio);
  const valores = plan.flatMap((s) =>
    c.cronograma[s.periodo - 1][s.semana - 1].map((titulo, i) => ({
      propuestaId: ids.propuestaId,
      egresadoId: ids.usuarioId,
      periodo: s.periodo,
      semana: s.semana,
      numero: i + 1,
      titulo,
      descripcion: `${titulo} como parte del proyecto.`,
    }))
  );
  const acts = await db.insert(actividades).values(valores).returning();
  acts.sort((a, b) => a.periodo - b.periodo || a.semana - b.semana || a.numero - b.numero);
  return { plan, acts };
}

// ── Formulario de visita: respuestas completas y favorables, con la explicación donde el formulario la pide ──

function respuestasVisita(fecha: string, c: ConfigPasantia): Respuestas {
  const r: Respuestas = {
    fecha_visita: fecha,
    modalidad: "Presencial",
    programada: "Quince días antes",
    dificultades_ingreso: "No (ninguna dificultad)",
    recibido_supervisor: "Sí",
    egresado_presente: "Sí",
    pasantes_otras_instituciones: ["Universidad de El Salvador (UES)"],
    pasantes_fiya: "Sí",
    numero_pasantes_unicaes: "De 1 a 5",
    familiar_horarios: "Parcialmente",
    familiar_horarios_explicacion: "El supervisor conoce el horario general, pero no los días de asesoría en la universidad.",
    satisfaccion_desempeno: "Muy satisfecha",
    satisfaccion_actitud: "Muy satisfecha",
    conoce_demanda_contratacion: "Sí",
    conoce_numero_contratacion: "Sí",
    numero_contrataciones: "Dos contrataciones de personal de informática en el último año.",
    conoce_graduados_unicaes: "Sí",
    numero_graduados_unicaes: "Tres graduados de Ingeniería en Sistemas Informáticos.",
    carta_recomendacion: "Sí",
    contratar_pasante: "Sí",
    egresado_comodo: "Sí",
    espera_contratacion: "Sí",
    recomendacion_universidad: `La empresa recomienda reforzar en la carrera el trabajo con metodologías ágiles y la redacción de documentación técnica. Destaca la disposición de ${c.primerNombre} para aprender y su responsabilidad en las entregas semanales.`,
  };
  // Completa las demás preguntas visibles con la primera opción (las respuestas favorables van primero).
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    for (const s of SECCIONES_VISITA) {
      if (!seccionVisible(s, r)) continue;
      for (const p of s.preguntas) {
        if (!preguntaVisible(p, r) || r[p.id] !== undefined) continue;
        if (p.tipo === "opcion") r[p.id] = p.opciones![0];
        else if (p.tipo === "multiple") r[p.id] = [p.opciones![0]];
        else if (p.tipo === "fecha") r[p.id] = fecha;
        else r[p.id] = "Sin observaciones adicionales; la situación es favorable para el egresado.";
      }
    }
  }
  for (const s of SECCIONES_VISITA) {
    for (const p of s.preguntas) {
      if (preguntaVisible(p, r) && requiereExplicacion(p, r) && !r[idExplicacion(p)]) {
        r[idExplicacion(p)] = "Se conversó con el supervisor y se acordó dar seguimiento en la siguiente reunión.";
      }
    }
  }
  return r;
}

// ── Elementos del informe final ──

const AGRADECIMIENTOS = (c: ConfigPasantia) =>
  [
    "Agradezco a Dios por la sabiduría y la fortaleza que me permitieron culminar esta etapa de mi formación profesional.",
    "A mi familia, por su apoyo incondicional durante toda la carrera y especialmente durante los meses de la pasantía.",
    `Al personal de la empresa y a mi supervisor empresarial, por la confianza depositada y por compartir su experiencia en cada una de las actividades desarrolladas en el proyecto «${c.titulo}».`,
    "A mi asesor designado y a la Universidad Católica de El Salvador, por su acompañamiento y orientación durante todo el proceso.",
  ].join("\n");

/** Carta de finalización de prueba (imagen PNG generada), firmada por el supervisor de la pasantía. */
async function generarCarta(c: ConfigPasantia) {
  const [sup] = filas<{ nombres: string; apellidos: string; cargo: string | null; empresa: string }>(
    await db.execute(
      sql`SELECT s.nombres, s.apellidos, s.cargo, e.nombre AS empresa FROM supervisores s JOIN empresas e ON e.id = s.empresa_id WHERE s.id = ${c.supervisorId}`
    )
  );
  const lineas = [
    "Santa Ana, septiembre de 2026",
    "",
    "A quien corresponda:",
    "",
    "Por medio de la presente expresamos nuestra satisfacción",
    "con el desempeño de",
    `${c.nombre},`,
    "durante su pasantía en nuestra institución, tanto en su",
    "comportamiento como en el desarrollo de sus actividades.",
    "",
    "(Carta de prueba generada para revisar el sistema)",
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100">
    <rect width="850" height="1100" fill="#ffffff"/>
    <rect width="850" height="90" fill="#800000"/>
    <text x="425" y="57" font-family="serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${sup.empresa.toUpperCase()}</text>
    ${lineas.map((l, i) => `<text x="80" y="${180 + i * 36}" font-family="serif" font-size="19" fill="#000000">${l}</text>`).join("")}
    <line x1="80" y1="760" x2="420" y2="760" stroke="#000000"/>
    <text x="80" y="790" font-family="serif" font-size="19" fill="#000000">${sup.nombres} ${sup.apellidos}</text>
    <text x="80" y="820" font-family="serif" font-size="19" fill="#000000">${sup.cargo ?? "Supervisor empresarial"}</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ── Cambios aprobados al cronograma (anexos 1 y 2 del informe final) ──

type Actividad = typeof actividades.$inferSelect;
type Evento = (
  actorRol: string,
  tipo: string,
  descripcion: string,
  creadoEn: Date,
  extra?: Partial<typeof bitacoraEventos.$inferInsert>
) => void;

async function aplicarCambiosCronograma(
  ids: { usuarioId: number; propuestaId: number },
  plan: SemanaPlan[],
  acts: Actividad[],
  evento: Evento
) {
  const semana = (periodo: number, num: number) => plan.find((s) => s.periodo === periodo && s.semana === num)!;
  // Nota del supervisor que acompaña cada solicitud (se copia un PDF de demostración).
  const nota = sql`(SELECT archivo_url FROM cartas_aceptacion WHERE propuesta_id = ${PROPUESTA_PLANTILLA_ID})`;

  // Agregada: una actividad nueva en la semana 4.2 (se registra y aprueba como las demás).
  const [agregada] = await db
    .insert(actividades)
    .values({
      propuestaId: ids.propuestaId,
      egresadoId: ids.usuarioId,
      periodo: 4,
      semana: 2,
      numero: 5,
      titulo: "Implementación de notificaciones por correo electrónico",
      descripcion: "Implementación de notificaciones por correo electrónico como parte del proyecto.",
      esNueva: true,
    })
    .returning();
  acts.push(agregada);
  // Eliminada: actividad de la semana 2.3 que quedó fuera de alcance (conserva su código histórico).
  const [eliminada] = await db
    .insert(actividades)
    .values({
      propuestaId: ids.propuestaId,
      egresadoId: ids.usuarioId,
      periodo: 2,
      semana: 3,
      numero: 5,
      titulo: "Prototipo del módulo de cumplimiento normativo",
      descripcion: "Prototipo del módulo de cumplimiento normativo.",
      eliminada: true,
    })
    .returning();
  // Modificada: cambio de título de la actividad 3.1.3.
  const modificada = acts.find((a) => a.periodo === 3 && a.semana === 1 && a.numero === 3)!;
  const nuevoTitulo = "Creación y carga inicial de la base de datos de pruebas";
  await db
    .update(actividades)
    .set({ titulo: nuevoTitulo, tituloAnterior: modificada.titulo, descripcionAnterior: modificada.descripcion, esModificada: true })
    .where(eq(actividades.id, modificada.id));
  modificada.titulo = nuevoTitulo;
  // Pospuesta: la actividad 1.2.4 pasó a la segunda semana.
  const pospuesta = acts.find((a) => a.periodo === 1 && a.semana === 2 && a.numero === 4)!;

  const cambios = [
    {
      tipo: "posponer",
      verbo: "posponer",
      actividadId: pospuesta.id,
      periodoDestino: 1,
      semanaDestino: 2,
      fecha: mas(semana(1, 1).inicio, 3),
      codigo: "1.2.4",
      nombre: pospuesta.titulo,
      justificacion:
        "El área de cobros reprogramó la sesión de levantamiento de requerimientos no funcionales por el cierre contable del mes; el supervisor solicitó trasladarla a la semana siguiente.",
    },
    {
      tipo: "eliminar",
      verbo: "eliminar",
      actividadId: eliminada.id,
      fecha: mas(semana(2, 3).inicio, 1),
      codigo: "2.3.5",
      nombre: eliminada.titulo,
      justificacion:
        "La jefatura decidió que el módulo de cumplimiento normativo lo desarrollará el proveedor del sistema contable, por lo que la actividad quedó fuera del alcance de la pasantía.",
    },
    {
      tipo: "modificar",
      verbo: "modificar",
      actividadId: modificada.id,
      tituloPropuesto: nuevoTitulo,
      fecha: mas(semana(3, 1).inicio, 1),
      codigo: "3.1.3",
      nombre: nuevoTitulo,
      justificacion:
        "Además de crear la base de datos de pruebas, el supervisor solicitó cargar un conjunto inicial de datos anonimizados para las pruebas de los módulos.",
    },
    {
      tipo: "agregar",
      verbo: "agregar",
      periodoDestino: 4,
      semanaDestino: 2,
      tituloPropuesto: agregada.titulo,
      fecha: mas(semana(4, 2).inicio, -2),
      codigo: "4.2.5",
      nombre: agregada.titulo,
      justificacion:
        "La jefatura de créditos solicitó que los asociados reciban por correo electrónico la confirmación de sus pagos, lo que requiere una actividad adicional en el período 4.",
    },
  ];
  for (const k of cambios) {
    await db.insert(solicitudesCambioActividad).values({
      propuestaId: ids.propuestaId,
      tipo: k.tipo,
      actividadId: k.actividadId ?? null,
      periodoDestino: k.periodoDestino ?? null,
      semanaDestino: k.semanaDestino ?? null,
      tituloPropuesto: k.tituloPropuesto ?? null,
      documentoSupervisorUrl: nota,
      documentoSupervisorNombre: "nota_supervisor.pdf",
      justificacion: k.justificacion,
      estado: "aprobada",
      revisadoPor: ASESOR_ID,
      creadaEn: en(k.fecha, "09:00"),
      revisadoEn: en(k.fecha, "15:00"),
    });
    evento("egresado", "cambio_solicitado", `Solicitó ${k.verbo} la actividad ${k.codigo} (${k.nombre}) del cronograma.`, en(k.fecha, "09:00"), {
      detalle: k.justificacion,
    });
    evento("asesor", "cambio_aprobado", `Aprobó la solicitud para ${k.verbo} la actividad ${k.codigo} del cronograma.`, en(k.fecha, "15:00"));
  }
}

// ── Pasantía ──

async function sembrar(c: ConfigPasantia, hoy: string) {
  console.log(`\n== Pasantía ${c.clave.toUpperCase()}: ${c.nombre}`);
  await eliminarSembrado(c.correo);
  const periodoId = await asegurarCohorte(c);
  const ids = await faseInicio(c, periodoId);
  const { plan, acts } = await sembrarCronograma(c, ids);
  const periodosP = generarPeriodosPasantia(fechaLocalDesdeISO(c.inicio)).map((p) => ({ num: p.num, inicio: aISOLocal(p.inicio), fin: aISOLocal(p.fin) }));
  const [cohorte] = await db.select().from(periodos).where(eq(periodos.id, periodoId));
  const cartaFinalizacion = await generarCarta(c);
  const limites = [cohorte.maxPrimerInforme, cohorte.maxSegundoInforme, cohorte.maxTercerInforme, cohorte.maxCuartoInforme, cohorte.maxInformeFinal];

  const eventos: (typeof bitacoraEventos.$inferInsert)[] = [];
  const evento = (actorRol: string, tipo: string, descripcion: string, creadoEn: Date, extra: Partial<typeof bitacoraEventos.$inferInsert> = {}) =>
    eventos.push({
      propuestaId: ids.propuestaId,
      actorId: actorRol === "egresado" ? ids.usuarioId : actorRol === "asesor" ? ASESOR_ID : null,
      actorRol,
      tipo,
      descripcion,
      creadoEn,
      ...extra,
    });

  if (c.cambiosCronograma) await aplicarCambiosCronograma(ids, plan, acts, evento);

  // Registros de las semanas aprobadas.
  let numeroImagen = 0;
  const registros: (typeof registrosActividad.$inferInsert)[] = [];
  const problemas: string[] = [];
  plan.slice(0, c.semanasAprobadas).forEach((s, k) => {
    const deSemana = acts.filter((a) => a.periodo === s.periodo && a.semana === s.semana);
    const codigos = deSemana.map((a) => `${a.periodo}.${a.semana}.${a.numero}`).join(", ");
    for (const a of deSemana) {
      const cont = contenido(c, a.periodo, a.semana, a.numero, a.titulo!);
      problemas.push(...validarContenidoRegistro(cont).map((x) => `${a.periodo}.${a.semana}.${a.numero}: ${x}`));
      registros.push({
        actividadId: a.id,
        estado: "aprobado",
        fecha: s.enviadaEl,
        ...cont,
        numeroImagen: ++numeroImagen,
        enviadoEn: en(s.enviadaEl, "17:30"),
        declaracionAutoriaEn: en(s.enviadaEl, "17:30"),
        revisadoPor: ASESOR_ID,
        revisadoEn: en(s.revisadaEl, "10:15"),
        creadoEn: en(s.inicio, "08:00"),
        actualizadoEn: en(s.revisadaEl, "10:15"),
      });
    }
    // Algunas semanas pasan por una corrección antes de aprobarse (queda en la bitácora).
    const conCorreccion = k % 5 === 1;
    evento(
      "egresado",
      "semana_enviada",
      `Envió al asesor la Semana ${s.semana} del Período ${s.periodo}: ${codigos}. Declaró que el contenido es de su autoría.`,
      en(conCorreccion ? mas(s.enviadaEl, -2) : s.enviadaEl, "17:30"),
      { referencia: `semana:${s.periodo}.${s.semana}` }
    );
    if (conCorreccion) {
      const a = deSemana[1];
      evento(
        "asesor",
        "semana_observada",
        `Devolvió la Semana ${s.semana} del Período ${s.periodo} con observaciones en las actividades ${a.periodo}.${a.semana}.${a.numero}.`,
        en(mas(s.enviadaEl, -1), "09:00"),
        {
          referencia: `semana:${s.periodo}.${s.semana}`,
          detalle: `${a.periodo}.${a.semana}.${a.numero}\nDescripción de la actividad: Detalle con mayor precisión qué artefactos elaboró y cómo los validó con el supervisor.`,
        }
      );
      evento(
        "egresado",
        "semana_enviada",
        `Envió al asesor la Semana ${s.semana} del Período ${s.periodo}: ${a.periodo}.${a.semana}.${a.numero}. Declaró que el contenido es de su autoría.`,
        en(s.enviadaEl, "17:30"),
        { referencia: `semana:${s.periodo}.${s.semana}` }
      );
    }
    evento("asesor", "semana_aprobada", `Aprobó la Semana ${s.semana} del Período ${s.periodo}: ${codigos}.`, en(s.revisadaEl, "10:15"), {
      referencia: `semana:${s.periodo}.${s.semana}`,
    });
  });
  if (problemas.length) throw new Error(`Contenido inválido:\n${problemas.slice(0, 10).join("\n")}`);
  const insertados = await db.insert(registrosActividad).values(registros).returning({ id: registrosActividad.id, actividadId: registrosActividad.actividadId });
  const registroDe = new Map(insertados.map((r) => [r.actividadId, r.id]));

  // Imágenes: una de soporte adicional por semana (una de fuente externa) y un anexo por período.
  const imagenes: (typeof imagenesActividad.$inferInsert)[] = [];
  plan.slice(0, c.semanasAprobadas).forEach((s) => {
    const deSemana = acts.filter((a) => a.periodo === s.periodo && a.semana === s.semana);
    const externa = s.periodo === 1 && s.semana === 3;
    if (externa && validarOrigenImagen("externa", FUENTE_EXTERNA).length) throw new Error("Fuente externa inválida");
    imagenes.push({
      registroId: registroDe.get(deSemana[0].id)!,
      tipo: "soporte",
      url: IMAGEN,
      leyenda: externa ? "Notación BPMN utilizada en el modelado de procesos" : `Detalle complementario de la actividad ${s.periodo}.${s.semana}.1`,
      origen: externa ? "externa" : "propia",
      fuente: externa ? FUENTE_EXTERNA : null,
      creadoEn: en(s.inicio, "15:00"),
    });
    if (s.semana === 4) {
      imagenes.push({
        registroId: registroDe.get(deSemana[3].id)!,
        tipo: "anexo",
        url: IMAGEN,
        leyenda: `Documento de respaldo del período ${s.periodo}`,
        origen: "propia",
        creadoEn: en(s.inicio, "15:10"),
      });
    }
  });
  if (imagenes.length) await db.insert(imagenesActividad).values(imagenes);

  // Notas semanales del asesor (opcionales): semanas 1 y 3 de cada período con semanas aprobadas.
  const notas = plan
    .slice(0, c.semanasAprobadas)
    .filter((s) => s.semana === 1 || s.semana === 3)
    .map((s) => {
      const respuestas = notaSemanal(s.semana);
      return {
        propuestaId: ids.propuestaId,
        periodo: s.periodo,
        semana: s.semana,
        nota: resumenNotaSemanal({ respuestas, general: "" }),
        respuestas,
        asesorId: ASESOR_ID,
        actualizadoEn: en(s.revisadaEl, "10:30"),
      };
    });
  if (notas.length) await db.insert(notasSeguimientoAsesor).values(notas);
  for (const n of notas) {
    evento("asesor", "nota_seguimiento", `Registró una nota de seguimiento de la Semana ${n.semana} del Período ${n.periodo}.`, n.actualizadoEn, {
      referencia: `nota:${n.periodo}.${n.semana}`,
      detalle: n.nota,
    });
  }

  // Visita del asesor (día 92 desde el inicio) si ya transcurrió.
  const fechaVisita = mas(c.inicio, 92);
  if (fechaVisita <= hoy) {
    const respuestas = respuestasVisita(fechaVisita, c);
    const fotos = [
      { url: IMAGEN, leyenda: `Reunión de visita con el supervisor empresarial y ${c.primerNombre} en las instalaciones de la empresa` },
      { url: IMAGEN, leyenda: `Puesto de trabajo asignado a ${c.primerNombre} durante la pasantía` },
    ];
    const prob = validarInformeVisita(respuestas, fotos, null);
    if (prob.length) throw new Error(`Visita inválida:\n${prob.join("\n")}`);
    await db.insert(informesVisita).values({
      propuestaId: ids.propuestaId,
      asesorId: ASESOR_ID,
      estado: "completado",
      respuestas,
      fotos,
      completadoEn: en(fechaVisita, "16:00"),
      creadoEn: en(fechaVisita, "15:00"),
      actualizadoEn: en(fechaVisita, "16:00"),
    });
    evento("asesor", "visita_completada", `Completó el informe de visita a la empresa (visita del ${fechaVisita.split("-").reverse().join("/")}).`, en(fechaVisita, "16:00"), {
      referencia: "visita",
    });
  }

  // Informes de período: enviados el penúltimo día y aprobados el último (los del período en curso quedan en redacción).
  const informes = periodosP.map((p, i) => {
    const aprobado = p.num <= c.informesAprobados;
    const enviado = mas(p.fin, -1);
    const comentarios = aprobado ? comentariosDecanato(p.num, c.nombre) : null;
    if (comentarios && validarComentariosCompletos(comentarios).length) throw new Error("Comentarios del decanato incompletos");
    return {
      propuestaId: ids.propuestaId,
      numero: p.num,
      periodoDesde: aprobado ? p.inicio : null,
      periodoHasta: aprobado ? p.fin : null,
      fechaPresentacion: aprobado ? enviado : null,
      estado: aprobado ? "aprobado" : "redactando",
      fechaLimite: limites[i],
      enviadoEn: aprobado ? en(enviado, "16:00") : null,
      cumplimiento: aprobado ? "a_tiempo" : null,
      desviacionDias: aprobado ? -1 : null,
      comentarioAsesor: aprobado ? `El ${nombreInforme(p.num).toLowerCase()} cumple con la extensión y la calidad esperadas.` : null,
      revisadoPor: aprobado ? ASESOR_ID : null,
      revisadoEn: aprobado ? en(p.fin, "11:00") : null,
      alertaCierreEnviada: aprobado,
      comentariosDecanato: comentarios,
      comentariosDecanatoEn: aprobado ? en(enviado, "18:00") : null,
      // Informe final aprobado: agradecimientos del egresado y carta de finalización verificada por el asesor.
      ...(aprobado && p.num === periodosP.length
        ? {
            agradecimientos: AGRADECIMIENTOS(c),
            cartaFinalizacion: { url: cartaFinalizacion, nombre: "carta_finalizacion.png", subidaEn: en(mas(p.fin, -2), "18:10").toISOString() },
            cartaFinalizacionVerificadaEn: en(p.fin, "10:30"),
            cartaFinalizacionVerificadaPor: ASESOR_ID,
          }
        : {}),
      creadoEn: en(c.inicio, "08:00"),
      actualizadoEn: aprobado ? en(p.fin, "11:00") : en(c.inicio, "08:00"),
    };
  });
  const infs = await db.insert(informesMensuales).values(informes).returning({ id: informesMensuales.id, numero: informesMensuales.numero });
  const notifs: (typeof notificaciones.$inferInsert)[] = [];
  for (const inf of infs.filter((x) => x.numero <= c.informesAprobados)) {
    const p = periodosP[inf.numero - 1];
    const nombre = nombreInforme(inf.numero);
    evento("egresado", "informe_enviado", `Envió el ${nombre} al asesor (a tiempo).`, en(mas(p.fin, -1), "16:00"), { referencia: `informe:${inf.id}` });
    evento("asesor", "comentarios_asesor", `Registró sus comentarios para el decanato del ${nombre} (completos).`, en(mas(p.fin, -1), "18:00"), {
      referencia: `informe:${inf.id}`,
    });
    evento("asesor", "informe_aprobado", `Aprobó el ${nombre}.`, en(p.fin, "11:00"), {
      referencia: `informe:${inf.id}`,
      detalle: informes[inf.numero - 1].comentarioAsesor,
    });
    notifs.push({ usuarioId: ids.usuarioId, tipo: "informe_mensual_aprobado", mensaje: `Su asesor designado aprobó el ${nombre}.`, leida: true, creadoEn: en(p.fin, "11:00") });
  }
  if (notifs.length) await db.insert(notificaciones).values(notifs);

  if (eventos.length) await db.insert(bitacoraEventos).values(eventos);

  console.log(
    `  Usuario ${ids.usuarioId}, propuesta ${ids.propuestaId}: ${acts.length} actividades, ${registros.length} aprobadas, ${imagenes.length} imágenes adicionales, ${notas.length} notas, ${infs.length} informes, ${eventos.length} eventos.`
  );
  return { ...ids, plan, acts, registroDe, periodosP };
}

async function main() {
  const cual = (process.argv[2] || "a").toLowerCase();
  const hoy = aISOLocal(new Date());
  if (cual === "a" || cual === "todos") await sembrar(PASANTIA_A, hoy);
  if (cual === "b" || cual === "todos") await sembrar(PASANTIA_B, hoy);
  console.log("\nListo. Contraseña de los usuarios sembrados: la misma del egresado de demostración.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

