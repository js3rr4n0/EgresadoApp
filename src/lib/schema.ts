import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  smallint,
  date,
  timestamp,
  jsonb,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─────────────────────────── Catálogo ───────────────────────────

export const facultades = pgTable("facultades", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 50 }),
  activo: boolean("activo").notNull().default(true),
});

export const carreras = pgTable("carreras", {
  id: serial("id").primaryKey(),
  facultadId: integer("facultad_id")
    .notNull()
    .references(() => facultades.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 50 }),
  activo: boolean("activo").notNull().default(true),
});

// ─────────────────────────── Usuarios ───────────────────────────

export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    nombreCompleto: varchar("nombre_completo", { length: 255 }).notNull(),
    correo: varchar("correo", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    rol: varchar("rol", { length: 20 }).notNull(),
    carnet: varchar("carnet", { length: 50 }),
    carreraId: integer("carrera_id").references(() => carreras.id),
    facultadId: integer("facultad_id").references(() => facultades.id),
    activo: boolean("activo").notNull().default(true),
    cohorte: varchar("cohorte", { length: 20 }),
    carrerasAsignadas: jsonb("carreras_asignadas"), // para asesor/decanato
    cohortesAsignadas: jsonb("cohortes_asignadas"), // para historial de cohortes de asesor/decanato [{cohorte: "C12026", activa: true}]
  },
  (table) => [
    check(
      "rol_check",
      sql`${table.rol} IN ('admin', 'decanato', 'coordinador', 'asesor', 'egresado')`
    ),
  ]
);

// ─────────────────────────── Periodos ───────────────────────────

export const periodos = pgTable("periodos", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(), // Ej: C2-2025
  inicioRecepcion: date("inicio_recepcion").notNull(),
  finRecepcion: date("fin_recepcion").notNull(),
  
  // Fechas máximas calculadas para la cohorte
  maxAprobacionPropuesta: date("max_aprobacion_propuesta").notNull(),
  maxInicioProceso: date("max_inicio_proceso").notNull(),
  maxPrimerInforme: date("max_primer_informe").notNull(),
  maxSegundoInforme: date("max_segundo_informe").notNull(),
  maxTercerInforme: date("max_tercer_informe").notNull(),
  maxCuartoInforme: date("max_cuarto_informe").notNull(),
  visitaAsesorInicio: date("visita_asesor_inicio").notNull(),
  visitaAsesorFin: date("visita_asesor_fin").notNull(),
  maxInformeFinal: date("max_informe_final").notNull(),
  maxAprobacionFinal: date("max_aprobacion_final").notNull(),

  activo: boolean("activo").notNull().default(true),
});

// ─────────────────────────── Empresas y Supervisores ───────────────────────────

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  area: varchar("area", { length: 255 }),
  descripcion: text("descripcion"),
  antecedentes: text("antecedentes"),
  direccion: text("direccion"),
  organigramaUrl: text("organigrama_url"),
  mapaUrl: text("mapa_url"),
  habilitada: boolean("habilitada").notNull().default(true),
  verificada: boolean("verificada").notNull().default(false),
  actualizadaEn: timestamp("actualizada_en", { withTimezone: true }).defaultNow(),
});

export const supervisores = pgTable("supervisores", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  sucursalId: integer("sucursal_id"), // Reference to sucursales.id
  titulo: varchar("titulo", { length: 50 }),
  especialidad: varchar("especialidad", { length: 255 }),
  nombres: varchar("nombres", { length: 255 }).notNull(),
  apellidos: varchar("apellidos", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  correo: varchar("correo", { length: 255 }),
  firmaUrl: text("firma_url"),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
});

export const firmantes = pgTable("firmantes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  sucursalId: integer("sucursal_id"), // Reference to sucursales.id
  titulo: varchar("titulo", { length: 50 }),
  nombres: varchar("nombres", { length: 255 }).notNull(),
  apellidos: varchar("apellidos", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  correo: varchar("correo", { length: 255 }),
  firmaUrl: text("firma_url"),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
});

export const organigramasEmpresa = pgTable("organigramas_empresa", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  subidoEn: timestamp("subido_en", { withTimezone: true }).defaultNow(),
});

export const historialEmpresas = pgTable("historial_empresas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  adminId: integer("admin_id").references(() => usuarios.id),
  cambios: jsonb("cambios").notNull(), // { before: {...}, after: {...} } or text
  fecha: timestamp("fecha", { withTimezone: true }).defaultNow(),
});

export const sucursales = pgTable("sucursales", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 255 }).notNull(), // Ej: "Santa Ana Bypass"
  direccion: text("direccion"),
  telefono: varchar("telefono", { length: 50 }),
  mapaUrl: text("mapa_url"),
  descripcion: text("descripcion"),
  antecedentes: text("antecedentes"),
  creadaEn: timestamp("creada_en", { withTimezone: true }).defaultNow(),
});

// ─────────────────────────── Gate de documentos del egresado ───────────────────────────

export const documentosEgresado = pgTable(
  "documentos_egresado",
  {
    id: serial("id").primaryKey(),
    egresadoId: integer("egresado_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 30 }).notNull(),
    archivoUrl: text("archivo_url").notNull(),
    subidoEn: timestamp("subido_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("documentos_egresado_unique").on(table.egresadoId, table.tipo),
    check(
      "tipo_doc_check",
      sql`${table.tipo} IN ('servicio_social', 'certificacion_notas', 'pago_tg')`
    ),
  ]
);

// ─────────────────────────── Propuestas ───────────────────────────

export const propuestas = pgTable(
  "propuestas",
  {
    id: serial("id").primaryKey(),
    egresadoId: integer("egresado_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    periodoId: integer("periodo_id")
      .notNull()
      .references(() => periodos.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 20 }).notNull(),
    numero: smallint("numero").notNull(),
    estado: varchar("estado", { length: 30 }).notNull().default("redactando"),
    empresaId: integer("empresa_id").references(() => empresas.id),
    sucursalId: integer("sucursal_id").references(() => sucursales.id),
    supervisorId: integer("supervisor_id").references(() => supervisores.id),
    justificacionProceso: text("justificacion_proceso"),
    asesorId: integer("asesor_id").references(() => usuarios.id),
    coordinadorId: integer("coordinador_id").references(() => usuarios.id),
    observaciones: text("observaciones"),
    titulo: text("titulo"),
    enviadaEn: timestamp("enviada_en", { withTimezone: true }),
    fechaAprobacion: timestamp("fecha_aprobacion", { withTimezone: true }),
    bloqueada: boolean("bloqueada").notNull().default(false),
  },
  (table) => [
    unique("propuestas_egresado_periodo_numero").on(
      table.egresadoId,
      table.periodoId,
      table.numero
    ),
    check(
      "tipo_propuesta_check",
      sql`${table.tipo} IN ('pasantia', 'proyecto', 'investigacion')`
    ),
    check(
      "numero_propuesta_check",
      sql`${table.numero} BETWEEN 1 AND 3`
    ),
    check(
      "estado_propuesta_check",
      sql`${table.estado} IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'coordinador_asignado', 'aprobada', 'rechazada', 'anulada')`
    ),
  ]
);

// ─────────────────────────── Carta de aceptación ───────────────────────────

export const cartasAceptacion = pgTable("cartas_aceptacion", {
  id: serial("id").primaryKey(),
  propuestaId: integer("propuesta_id")
    .notNull()
    .unique()
    .references(() => propuestas.id, { onDelete: "cascade" }),
  archivoUrl: text("archivo_url"),
  fechaEmision: date("fecha_emision"),
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),
  supTitulo: varchar("sup_titulo", { length: 50 }),
  supNombres: varchar("sup_nombres", { length: 255 }),
  supApellidos: varchar("sup_apellidos", { length: 255 }),
  supCargo: varchar("sup_cargo", { length: 255 }),
  supTelefono: varchar("sup_telefono", { length: 50 }),
  supCorreo: varchar("sup_correo", { length: 255 }),
  emisorNombre: varchar("emisor_nombre", { length: 255 }),
  emisorCargo: varchar("emisor_cargo", { length: 255 }),
  emisorFirmaUrl: text("emisor_firma_url"),
  bloqueada: boolean("bloqueada").notNull().default(false),
});

// ─────────────────────────── Actividades ───────────────────────────

export const actividades = pgTable(
  "actividades",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    periodo: smallint("periodo").notNull(),
    semana: smallint("semana").notNull(),
    numero: smallint("numero").notNull(),
    titulo: text("titulo"),
    descripcion: text("descripcion").notNull(),
  },
  (table) => [
    unique("actividades_codigo_unico").on(
      table.propuestaId,
      table.periodo,
      table.semana,
      table.numero
    ),
  ]
);

export const semanasJustificadas = pgTable(
  "semanas_justificadas",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    periodo: smallint("periodo").notNull(),
    semana: smallint("semana").notNull(),
    justificacion: text("justificacion").notNull(),
  },
  (table) => [
    unique("semanas_justificadas_unico").on(
      table.propuestaId,
      table.periodo,
      table.semana
    ),
  ]
);

// ─────────────────────────── Solicitudes de Asesoría ───────────────────────────

export const solicitudesAsesor = pgTable(
  "solicitudes_asesor",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    asesorId: integer("asesor_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    coordinadorId: integer("coordinador_id").references(() => usuarios.id),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"), // 'pendiente', 'aceptada', 'rechazada'
    justificacionRechazo: text("justificacion_rechazo"),
    respondidoEn: timestamp("respondido_en", { withTimezone: true }),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "estado_solicitud_asesor_check",
      sql`${table.estado} IN ('pendiente', 'aceptada', 'rechazada')`
    ),
  ]
);

// ─────────────────────────── Solicitudes de Baja de Proyecto ───────────────────────────

export const solicitudesBaja = pgTable(
  "solicitudes_baja",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    asesorId: integer("asesor_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    coordinadorId: integer("coordinador_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    motivo: text("motivo").notNull(),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"), // 'pendiente', 'aprobada', 'rechazada'
    respuestaCoordinador: text("respuesta_coordinador"),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
    respondidoEn: timestamp("respondido_en", { withTimezone: true }),
  },
  (table) => [
    check(
      "estado_solicitud_baja_check",
      sql`${table.estado} IN ('pendiente', 'aprobada', 'rechazada')`
    ),
  ]
);

// ─────────────────────────── Solicitudes de empresa ───────────────────────────

export const solicitudesEmpresa = pgTable(
  "solicitudes_empresa",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    empresaId: integer("empresa_id").references(() => empresas.id),
    tipo: varchar("tipo", { length: 20 }).notNull(),
    datos: jsonb("datos"), // empresa + supervisor propuestos por el egresado
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    justificacionRechazo: text("justificacion_rechazo"),
    revisadoPor: integer("revisado_por").references(() => usuarios.id),
    revisadoEn: timestamp("revisado_en", { withTimezone: true }),
    creadaEn: timestamp("creada_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      "tipo_solicitud_check",
      sql`${table.tipo} IN ('nueva', 'actualizacion', 'modificacion', 'datos_alumno')`
    ),
    check(
      "estado_solicitud_check",
      sql`${table.estado} IN ('pendiente', 'aprobada', 'rechazada')`
    ),
  ]
);

// ─────────────────────────── Trazabilidad ───────────────────────────

export const historialEstados = pgTable("historial_estados", {
  id: serial("id").primaryKey(),
  propuestaId: integer("propuesta_id")
    .notNull()
    .references(() => propuestas.id, { onDelete: "cascade" }),
  de: varchar("de", { length: 30 }).notNull(),
  a: varchar("a", { length: 30 }).notNull(),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const notificaciones = pgTable("notificaciones", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  mensaje: text("mensaje").notNull(),
  leida: boolean("leida").notNull().default(false),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────── Temas históricos ───────────────────────────

export const temasHistoricos = pgTable("temas_historicos", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  asesorNombre: varchar("asesor_nombre", { length: 255 }),
  tipo: varchar("tipo", { length: 20 }),
  estado: varchar("estado", { length: 30 }),
  carreraId: integer("carrera_id").references(() => carreras.id),
  facultadId: integer("facultad_id").references(() => facultades.id),
  carnets: text("carnets").array(), // TEXT[] in PostgreSQL
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),
});

// ─────────────────────────── Proyecto Específico ───────────────────────────

export const integrantesProyecto = pgTable(
  "integrantes_proyecto",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    egresadoId: integer("egresado_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    invitadoPorId: integer("invitado_por_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"), // 'pendiente', 'aceptado', 'rechazado'
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("unique_propuesta_egresado_integrante").on(
      table.propuestaId,
      table.egresadoId
    ),
    check(
      "estado_integrante_check",
      sql`${table.estado} IN ('pendiente', 'aceptado', 'rechazado')`
    ),
  ]
);

export const detallesProyecto = pgTable("detalles_proyecto", {
  id: serial("id").primaryKey(),
  propuestaId: integer("propuesta_id")
    .notNull()
    .unique()
    .references(() => propuestas.id, { onDelete: "cascade" }),
  // Step 2: Actores intervinientes
  actorPatrocinador: text("actor_patrocinador"),
  actorBeneficiario: text("actor_beneficiario"),
  actorEjecutor: text("actor_ejecutor"),
  actorFinancista: text("actor_financista"),
  // Step 4: Descripción del problema
  descripcionProblema: text("descripcion_problema"),
  // Step 5: Justificación del proyecto
  justificacion: text("justificacion"),
  // Step 6: Alcance del proyecto
  alcance: text("alcance"),
  // Step 7: Objetivos del proyecto
  objetivoGeneral: text("objetivo_general"),
  objetivosEspecificos: jsonb("objetivos_especificos"), // Array of { titulo: string, descripcion: string }
});

// ─────────────────────────── Documentos de Aprobación de Propuesta ───────────────────────────

export const documentosPropuesta = pgTable(
  "documentos_propuesta",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 50 }).notNull(), // 'propuesta_aceptada', 'plan_trabajo_firmado', 'dictamen_plan_trabajo', 'dictamen_propuesta'
    archivoUrl: text("archivo_url").notNull(),
    nombreArchivo: varchar("nombre_archivo", { length: 255 }),
    subidoEn: timestamp("subido_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("documentos_propuesta_unique").on(table.propuestaId, table.tipo),
  ]
);

// ─────────────────────────── Informes de Seguimiento — Hito 1: Primer Contacto ───────────────────────────

export const informesPrimerContacto = pgTable(
  "informes_primer_contacto",
  {
    id: serial("id").primaryKey(),
    propuestaId: integer("propuesta_id")
      .notNull()
      .unique()
      .references(() => propuestas.id, { onDelete: "cascade" }),
    asesorId: integer("asesor_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    supervisorId: integer("supervisor_id")
      .notNull()
      .references(() => supervisores.id, { onDelete: "cascade" }),

    // Estado del informe
    estado: varchar("estado", { length: 20 }).notNull().default("borrador"), // 'borrador', 'enviado', 'anulado'

    // Metadatos de cumplimiento congelados
    fechaLimite: timestamp("fecha_limite", { withTimezone: true }).notNull(),
    enviadoEn: timestamp("enviado_en", { withTimezone: true }),
    cumplimiento: varchar("cumplimiento", { length: 25 }), // 'a_tiempo', 'fuera_de_tiempo'
    desviacionDias: integer("desviacion_dias"),

    // Pantalla 1: Verificación de Interlocutor
    contactoPrevio: boolean("contacto_previo"),
    medioContacto: varchar("medio_contacto", { length: 50 }), // Para rama SÍ: 'llamada', 'correo', 'videollamada', 'whatsapp', 'visita'
    fechaCita: date("fecha_cita"), // Para rama NO
    modalidadCita: varchar("modalidad_cita", { length: 50 }), // Para rama NO: 'visita_fisica', 'videollamada'
    evidenciaUrls: jsonb("evidencia_urls"), // Array de URLs de archivos subidos

    // Pantalla 2: Guion y Acuerdos
    objetivosEntrevista: jsonb("objetivos_entrevista"), // Array de strings
    mecanismosComunicacion: jsonb("mecanismos_comunicacion"), // Array de strings
    aceptaInformesMensuales: boolean("acepta_informes_mensuales"),

    // Campo Crítico: Validación de Actividades
    resultadoValidacion: varchar("resultado_validacion", { length: 30 }), // 'aprobada', 'con_modificaciones', 'rechazada'
    justificacionResultado: text("justificacion_resultado"),

    // Anulación administrativa
    anuladoPor: integer("anulado_por").references(() => usuarios.id),
    anuladoEn: timestamp("anulado_en", { withTimezone: true }),
    motivoAnulacion: text("motivo_anulacion"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      "estado_informe_check",
      sql`${table.estado} IN ('borrador', 'enviado', 'anulado')`
    ),
    check(
      "resultado_validacion_check",
      sql`${table.resultadoValidacion} IS NULL OR ${table.resultadoValidacion} IN ('aprobada', 'con_modificaciones', 'rechazada')`
    ),
  ]
);



