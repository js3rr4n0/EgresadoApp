CREATE TABLE "bitacoras_semanales" (
	"id" serial PRIMARY KEY NOT NULL,
	"informe_id" integer NOT NULL,
	"semana" smallint NOT NULL,
	"descripcion" text,
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "bitacoras_semanales_unique" UNIQUE("informe_id","semana")
);
--> statement-breakpoint
CREATE TABLE "evidencias_informe_mensual" (
	"id" serial PRIMARY KEY NOT NULL,
	"informe_id" integer NOT NULL,
	"semana" smallint NOT NULL,
	"nombre_archivo" varchar(255),
	"archivo_url" text NOT NULL,
	"leyenda" varchar(255),
	"subido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "informes_mensuales" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"numero" smallint NOT NULL,
	"periodo_desde" date,
	"periodo_hasta" date,
	"fecha_presentacion" date,
	"estado" varchar(20) DEFAULT 'redactando' NOT NULL,
	"fecha_limite" date NOT NULL,
	"enviado_en" timestamp with time zone,
	"cumplimiento" varchar(20),
	"desviacion_dias" integer,
	"comentario_asesor" text,
	"revisado_por" integer,
	"revisado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "informes_mensuales_unique" UNIQUE("propuesta_id","numero"),
	CONSTRAINT "numero_informe_mensual_check" CHECK ("informes_mensuales"."numero" BETWEEN 1 AND 4),
	CONSTRAINT "estado_informe_mensual_check" CHECK ("informes_mensuales"."estado" IN ('redactando', 'enviado', 'observado', 'aprobado'))
);
--> statement-breakpoint
CREATE TABLE "ratificaciones_propuesta" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"huella_firmada" text NOT NULL,
	"momento" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_ratificacion_propuesta_usuario" UNIQUE("propuesta_id","usuario_id")
);
--> statement-breakpoint
ALTER TABLE "integrantes_proyecto" DROP CONSTRAINT "estado_integrante_check";--> statement-breakpoint
ALTER TABLE "propuestas" DROP CONSTRAINT "estado_propuesta_check";--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "egresado_id" integer;--> statement-breakpoint
ALTER TABLE "detalles_proyecto" ADD COLUMN "objetivo_general_anterior" text;--> statement-breakpoint
ALTER TABLE "detalles_proyecto" ADD COLUMN "objetivos_especificos_anteriores" jsonb;--> statement-breakpoint
ALTER TABLE "bitacoras_semanales" ADD CONSTRAINT "bitacoras_semanales_informe_id_informes_mensuales_id_fk" FOREIGN KEY ("informe_id") REFERENCES "public"."informes_mensuales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencias_informe_mensual" ADD CONSTRAINT "evidencias_informe_mensual_informe_id_informes_mensuales_id_fk" FOREIGN KEY ("informe_id") REFERENCES "public"."informes_mensuales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informes_mensuales" ADD CONSTRAINT "informes_mensuales_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informes_mensuales" ADD CONSTRAINT "informes_mensuales_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratificaciones_propuesta" ADD CONSTRAINT "ratificaciones_propuesta_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratificaciones_propuesta" ADD CONSTRAINT "ratificaciones_propuesta_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_egresado_id_usuarios_id_fk" FOREIGN KEY ("egresado_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrantes_proyecto" ADD CONSTRAINT "estado_integrante_check" CHECK ("integrantes_proyecto"."estado" IN ('pendiente', 'aceptado', 'rechazado', 'retirado', 'concluido'));--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "estado_propuesta_check" CHECK ("propuestas"."estado" IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'coordinador_asignado', 'aprobada', 'primer_contacto_completado', 'en_ejecucion', 'rechazada', 'anulada'));