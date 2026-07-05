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
    carrerasAsignadas: jsonb("carreras_asignadas"), // para asesor/decanato
  },
  (table) => [
    check(
      "rol_check",
      sql`${table.rol} IN ('admin', 'decanato', 'asesor', 'egresado')`
    ),
  ]
);

// ─────────────────────────── Periodos ───────────────────────────

export const periodos = pgTable("periodos", {
  id: serial("id").primaryKey(),
  inicioRecepcion: date("inicio_recepcion").notNull(),
  finRecepcion: date("fin_recepcion").notNull(),
  fechaPrimerInforme: date("fecha_primer_informe"),
  fechaInformeFinal: date("fecha_informe_final"),
  activo: boolean("activo").notNull().default(true),
});

// ─────────────────────────── Empresas y Supervisores ───────────────────────────

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  area: varchar("area", { length: 255 }),
  descripcion: text("descripcion"),
  antecedentes: text("antecedentes"),
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
    supervisorId: integer("supervisor_id").references(() => supervisores.id),
    justificacionProceso: text("justificacion_proceso"),
    enviadaEn: timestamp("enviada_en", { withTimezone: true }),
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
      sql`${table.tipo} IN ('pasantia', 'proyecto')`
    ),
    check(
      "numero_propuesta_check",
      sql`${table.numero} BETWEEN 1 AND 3`
    ),
    check(
      "estado_propuesta_check",
      sql`${table.estado} IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'aprobada', 'rechazada')`
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
  },
  (table) => [
    check(
      "tipo_solicitud_check",
      sql`${table.tipo} IN ('nueva', 'modificacion')`
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
