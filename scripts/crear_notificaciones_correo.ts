/**
 * Crea las tablas de preferencias de notificaciones por correo y carga las notificaciones de demostración por rol.
 * No envía correos: el envío real se conectará más adelante.
 *
 * Uso: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/crear_notificaciones_correo.ts
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { configNotificacionesCorreo } from "../src/lib/schema";
import { NOTIFICACIONES_DEMO, ROLES_NOTIFICACION } from "../src/lib/notificacionesCorreo";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "config_notificaciones_correo" (
      "id" serial PRIMARY KEY,
      "rol" varchar(20) NOT NULL,
      "clave" varchar(50) NOT NULL,
      "nombre" varchar(120) NOT NULL,
      "descripcion" text,
      "correo_habilitado" boolean NOT NULL DEFAULT true,
      "obligatoria" boolean NOT NULL DEFAULT false,
      "orden" smallint NOT NULL DEFAULT 0,
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "config_notificaciones_correo_unique" UNIQUE ("rol", "clave")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "preferencias_notificacion_correo" (
      "id" serial PRIMARY KEY,
      "usuario_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "config_id" integer NOT NULL REFERENCES "config_notificaciones_correo"("id") ON DELETE CASCADE,
      "recibir_correo" boolean NOT NULL,
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "preferencias_notificacion_correo_unique" UNIQUE ("usuario_id", "config_id")
    )
  `);

  const filas = ROLES_NOTIFICACION.flatMap((rol) =>
    NOTIFICACIONES_DEMO.map((n, i) => ({
      rol: rol.id,
      clave: n.clave,
      nombre: n.nombre,
      descripcion: `Notificación de demostración para el rol ${rol.label.toLowerCase()}; se asociará a un evento real del sistema.`,
      correoHabilitado: n.correoHabilitado,
      obligatoria: n.obligatoria,
      orden: i + 1,
    }))
  );
  await db.insert(configNotificacionesCorreo).values(filas).onConflictDoNothing();
  console.log(`Notificaciones de demostración listas (${filas.length} configuraciones).`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
