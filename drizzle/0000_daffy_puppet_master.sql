CREATE TABLE "actividades" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"periodo" smallint NOT NULL,
	"semana" smallint NOT NULL,
	"numero" smallint NOT NULL,
	"descripcion" text NOT NULL,
	CONSTRAINT "actividades_codigo_unico" UNIQUE("propuesta_id","periodo","semana","numero")
);
--> statement-breakpoint
CREATE TABLE "carreras" (
	"id" serial PRIMARY KEY NOT NULL,
	"facultad_id" integer NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"codigo" varchar(50),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cartas_aceptacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"archivo_url" text,
	"fecha_emision" date,
	"fecha_inicio" date,
	"fecha_fin" date,
	"sup_titulo" varchar(50),
	"sup_nombres" varchar(255),
	"sup_apellidos" varchar(255),
	"sup_cargo" varchar(255),
	"sup_telefono" varchar(50),
	"sup_correo" varchar(255),
	"emisor_nombre" varchar(255),
	"emisor_cargo" varchar(255),
	"emisor_firma_url" text,
	"bloqueada" boolean DEFAULT false NOT NULL,
	CONSTRAINT "cartas_aceptacion_propuesta_id_unique" UNIQUE("propuesta_id")
);
--> statement-breakpoint
CREATE TABLE "documentos_egresado" (
	"id" serial PRIMARY KEY NOT NULL,
	"egresado_id" integer NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"archivo_url" text NOT NULL,
	"subido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_egresado_unique" UNIQUE("egresado_id","tipo"),
	CONSTRAINT "tipo_doc_check" CHECK ("documentos_egresado"."tipo" IN ('servicio_social', 'certificacion_notas', 'pago_tg'))
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"area" varchar(255),
	"descripcion" text,
	"antecedentes" text,
	"organigrama_url" text,
	"mapa_url" text,
	"habilitada" boolean DEFAULT true NOT NULL,
	"verificada" boolean DEFAULT false NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facultades" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"codigo" varchar(50),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_estados" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"de" varchar(30) NOT NULL,
	"a" varchar(30) NOT NULL,
	"usuario_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"mensaje" text NOT NULL,
	"leida" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"inicio_recepcion" date NOT NULL,
	"fin_recepcion" date NOT NULL,
	"max_aprobacion_propuesta" date NOT NULL,
	"max_inicio_proceso" date NOT NULL,
	"max_primer_informe" date NOT NULL,
	"max_segundo_informe" date NOT NULL,
	"max_tercer_informe" date NOT NULL,
	"max_cuarto_informe" date NOT NULL,
	"visita_asesor_inicio" date NOT NULL,
	"visita_asesor_fin" date NOT NULL,
	"max_informe_final" date NOT NULL,
	"max_aprobacion_final" date NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propuestas" (
	"id" serial PRIMARY KEY NOT NULL,
	"egresado_id" integer NOT NULL,
	"periodo_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"numero" smallint NOT NULL,
	"estado" varchar(30) DEFAULT 'redactando' NOT NULL,
	"empresa_id" integer,
	"supervisor_id" integer,
	"justificacion_proceso" text,
	"enviada_en" timestamp with time zone,
	"bloqueada" boolean DEFAULT false NOT NULL,
	CONSTRAINT "propuestas_egresado_periodo_numero" UNIQUE("egresado_id","periodo_id","numero"),
	CONSTRAINT "tipo_propuesta_check" CHECK ("propuestas"."tipo" IN ('pasantia', 'proyecto')),
	CONSTRAINT "numero_propuesta_check" CHECK ("propuestas"."numero" BETWEEN 1 AND 3),
	CONSTRAINT "estado_propuesta_check" CHECK ("propuestas"."estado" IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'aprobada', 'rechazada'))
);
--> statement-breakpoint
CREATE TABLE "semanas_justificadas" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"periodo" smallint NOT NULL,
	"semana" smallint NOT NULL,
	"justificacion" text NOT NULL,
	CONSTRAINT "semanas_justificadas_unico" UNIQUE("propuesta_id","periodo","semana")
);
--> statement-breakpoint
CREATE TABLE "solicitudes_empresa" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"empresa_id" integer,
	"tipo" varchar(20) NOT NULL,
	"datos" jsonb,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"justificacion_rechazo" text,
	"revisado_por" integer,
	"revisado_en" timestamp with time zone,
	CONSTRAINT "tipo_solicitud_check" CHECK ("solicitudes_empresa"."tipo" IN ('nueva', 'modificacion')),
	CONSTRAINT "estado_solicitud_check" CHECK ("solicitudes_empresa"."estado" IN ('pendiente', 'aprobada', 'rechazada'))
);
--> statement-breakpoint
CREATE TABLE "supervisores" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"titulo" varchar(50),
	"especialidad" varchar(255),
	"nombres" varchar(255) NOT NULL,
	"apellidos" varchar(255) NOT NULL,
	"cargo" varchar(255),
	"telefono" varchar(50),
	"correo" varchar(255),
	"firma_url" text,
	"actualizado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "temas_historicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(500) NOT NULL,
	"asesor_nombre" varchar(255),
	"tipo" varchar(20),
	"estado" varchar(30),
	"carrera_id" integer,
	"facultad_id" integer,
	"carnets" text[],
	"fecha_inicio" date,
	"fecha_fin" date
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_completo" varchar(255) NOT NULL,
	"correo" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"rol" varchar(20) NOT NULL,
	"carnet" varchar(50),
	"carrera_id" integer,
	"facultad_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"carreras_asignadas" jsonb,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo"),
	CONSTRAINT "rol_check" CHECK ("usuarios"."rol" IN ('admin', 'decanato', 'asesor', 'egresado'))
);
--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carreras" ADD CONSTRAINT "carreras_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartas_aceptacion" ADD CONSTRAINT "cartas_aceptacion_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_egresado" ADD CONSTRAINT "documentos_egresado_egresado_id_usuarios_id_fk" FOREIGN KEY ("egresado_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_egresado_id_usuarios_id_fk" FOREIGN KEY ("egresado_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_supervisor_id_supervisores_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semanas_justificadas" ADD CONSTRAINT "semanas_justificadas_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_empresa" ADD CONSTRAINT "solicitudes_empresa_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_empresa" ADD CONSTRAINT "solicitudes_empresa_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_empresa" ADD CONSTRAINT "solicitudes_empresa_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisores" ADD CONSTRAINT "supervisores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temas_historicos" ADD CONSTRAINT "temas_historicos_carrera_id_carreras_id_fk" FOREIGN KEY ("carrera_id") REFERENCES "public"."carreras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temas_historicos" ADD CONSTRAINT "temas_historicos_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_carrera_id_carreras_id_fk" FOREIGN KEY ("carrera_id") REFERENCES "public"."carreras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE no action ON UPDATE no action;