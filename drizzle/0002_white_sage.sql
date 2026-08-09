CREATE TABLE "documentos_propuesta" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"archivo_url" text NOT NULL,
	"nombre_archivo" varchar(255),
	"subido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_propuesta_unique" UNIQUE("propuesta_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "evidencias_informe_primer_contacto" (
	"id" serial PRIMARY KEY NOT NULL,
	"informe_id" integer NOT NULL,
	"nombre_archivo" varchar(255),
	"archivo_url" text NOT NULL,
	"subido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "informes_primer_contacto" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"asesor_id" integer NOT NULL,
	"supervisor_id" integer NOT NULL,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"fecha_limite" timestamp with time zone NOT NULL,
	"enviado_en" timestamp with time zone,
	"cumplimiento" varchar(25),
	"desviacion_dias" integer,
	"contacto_previo" boolean,
	"medio_contacto" varchar(50),
	"fecha_cita" date,
	"modalidad_cita" varchar(50),
	"evidencia_urls" jsonb,
	"objetivos_entrevista" jsonb,
	"mecanismos_comunicacion" jsonb,
	"acepta_informes_mensuales" boolean,
	"resultado_validacion" varchar(30),
	"justificacion_resultado" text,
	"anulado_por" integer,
	"anulado_en" timestamp with time zone,
	"motivo_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "informes_primer_contacto_propuesta_id_unique" UNIQUE("propuesta_id"),
	CONSTRAINT "estado_informe_check" CHECK ("informes_primer_contacto"."estado" IN ('borrador', 'enviado', 'anulado')),
	CONSTRAINT "resultado_validacion_check" CHECK ("informes_primer_contacto"."resultado_validacion" IS NULL OR "informes_primer_contacto"."resultado_validacion" IN ('aprobada', 'con_modificaciones', 'rechazada'))
);
--> statement-breakpoint
CREATE TABLE "solicitudes_baja" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"asesor_id" integer NOT NULL,
	"coordinador_id" integer NOT NULL,
	"motivo" text NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"respuesta_coordinador" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"respondido_en" timestamp with time zone,
	CONSTRAINT "estado_solicitud_baja_check" CHECK ("solicitudes_baja"."estado" IN ('pendiente', 'aprobada', 'rechazada'))
);
--> statement-breakpoint
ALTER TABLE "propuestas" DROP CONSTRAINT "tipo_propuesta_check";--> statement-breakpoint
ALTER TABLE "propuestas" DROP CONSTRAINT "estado_propuesta_check";--> statement-breakpoint
ALTER TABLE "usuarios" DROP CONSTRAINT "rol_check";--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "titulo" text;--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "titulo_anterior" text;--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "descripcion_anterior" text;--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "es_nueva" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "es_modificada" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "propuestas" ADD COLUMN "coordinador_id" integer;--> statement-breakpoint
ALTER TABLE "propuestas" ADD COLUMN "titulo" text;--> statement-breakpoint
ALTER TABLE "propuestas" ADD COLUMN "fecha_aprobacion" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitudes_asesor" ADD COLUMN "coordinador_id" integer;--> statement-breakpoint
ALTER TABLE "documentos_propuesta" ADD CONSTRAINT "documentos_propuesta_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencias_informe_primer_contacto" ADD CONSTRAINT "evidencias_informe_primer_contacto_informe_id_informes_primer_contacto_id_fk" FOREIGN KEY ("informe_id") REFERENCES "public"."informes_primer_contacto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informes_primer_contacto" ADD CONSTRAINT "informes_primer_contacto_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informes_primer_contacto" ADD CONSTRAINT "informes_primer_contacto_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informes_primer_contacto" ADD CONSTRAINT "informes_primer_contacto_supervisor_id_supervisores_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informes_primer_contacto" ADD CONSTRAINT "informes_primer_contacto_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_baja" ADD CONSTRAINT "solicitudes_baja_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_baja" ADD CONSTRAINT "solicitudes_baja_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_baja" ADD CONSTRAINT "solicitudes_baja_coordinador_id_usuarios_id_fk" FOREIGN KEY ("coordinador_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_coordinador_id_usuarios_id_fk" FOREIGN KEY ("coordinador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_asesor" ADD CONSTRAINT "solicitudes_asesor_coordinador_id_usuarios_id_fk" FOREIGN KEY ("coordinador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "tipo_propuesta_check" CHECK ("propuestas"."tipo" IN ('pasantia', 'proyecto', 'investigacion'));--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "estado_propuesta_check" CHECK ("propuestas"."estado" IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'coordinador_asignado', 'aprobada', 'rechazada', 'anulada'));--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "rol_check" CHECK ("usuarios"."rol" IN ('admin', 'decanato', 'coordinador', 'asesor', 'egresado'));