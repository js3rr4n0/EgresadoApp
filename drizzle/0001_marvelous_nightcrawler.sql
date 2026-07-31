CREATE TABLE "detalles_proyecto" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"actor_patrocinador" text,
	"actor_beneficiario" text,
	"actor_ejecutor" text,
	"actor_financista" text,
	"descripcion_problema" text,
	"justificacion" text,
	"alcance" text,
	"objetivo_general" text,
	"objetivos_especificos" jsonb,
	CONSTRAINT "detalles_proyecto_propuesta_id_unique" UNIQUE("propuesta_id")
);
--> statement-breakpoint
CREATE TABLE "firmantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"sucursal_id" integer,
	"titulo" varchar(50),
	"nombres" varchar(255) NOT NULL,
	"apellidos" varchar(255) NOT NULL,
	"cargo" varchar(255),
	"telefono" varchar(50),
	"correo" varchar(255),
	"firma_url" text,
	"actualizado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historial_empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"admin_id" integer,
	"cambios" jsonb NOT NULL,
	"fecha" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integrantes_proyecto" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"egresado_id" integer NOT NULL,
	"invitado_por_id" integer NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_propuesta_egresado_integrante" UNIQUE("propuesta_id","egresado_id"),
	CONSTRAINT "estado_integrante_check" CHECK ("integrantes_proyecto"."estado" IN ('pendiente', 'aceptado', 'rechazado'))
);
--> statement-breakpoint
CREATE TABLE "organigramas_empresa" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"url" text NOT NULL,
	"subido_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "solicitudes_asesor" (
	"id" serial PRIMARY KEY NOT NULL,
	"propuesta_id" integer NOT NULL,
	"asesor_id" integer NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"justificacion_rechazo" text,
	"respondido_en" timestamp with time zone,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estado_solicitud_asesor_check" CHECK ("solicitudes_asesor"."estado" IN ('pendiente', 'aceptada', 'rechazada'))
);
--> statement-breakpoint
CREATE TABLE "sucursales" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"direccion" text,
	"telefono" varchar(50),
	"mapa_url" text,
	"descripcion" text,
	"antecedentes" text,
	"creada_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "solicitudes_empresa" DROP CONSTRAINT "tipo_solicitud_check";--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "direccion" text;--> statement-breakpoint
ALTER TABLE "propuestas" ADD COLUMN "sucursal_id" integer;--> statement-breakpoint
ALTER TABLE "propuestas" ADD COLUMN "asesor_id" integer;--> statement-breakpoint
ALTER TABLE "propuestas" ADD COLUMN "observaciones" text;--> statement-breakpoint
ALTER TABLE "solicitudes_empresa" ADD COLUMN "creada_en" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "supervisores" ADD COLUMN "sucursal_id" integer;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cohorte" varchar(20);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cohortes_asignadas" jsonb;--> statement-breakpoint
ALTER TABLE "detalles_proyecto" ADD CONSTRAINT "detalles_proyecto_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firmantes" ADD CONSTRAINT "firmantes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_empresas" ADD CONSTRAINT "historial_empresas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_empresas" ADD CONSTRAINT "historial_empresas_admin_id_usuarios_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrantes_proyecto" ADD CONSTRAINT "integrantes_proyecto_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrantes_proyecto" ADD CONSTRAINT "integrantes_proyecto_egresado_id_usuarios_id_fk" FOREIGN KEY ("egresado_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrantes_proyecto" ADD CONSTRAINT "integrantes_proyecto_invitado_por_id_usuarios_id_fk" FOREIGN KEY ("invitado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organigramas_empresa" ADD CONSTRAINT "organigramas_empresa_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_asesor" ADD CONSTRAINT "solicitudes_asesor_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_asesor" ADD CONSTRAINT "solicitudes_asesor_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_sucursal_id_sucursales_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_empresa" ADD CONSTRAINT "tipo_solicitud_check" CHECK ("solicitudes_empresa"."tipo" IN ('nueva', 'actualizacion', 'modificacion', 'datos_alumno'));