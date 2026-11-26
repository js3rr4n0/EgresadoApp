// Entrega V5 (specs/VALORACIONES_EMPRESAS_ASESORES.md): crea la tabla bitacora_usuarios (src/lib/schema.ts).
// Solo agrega una tabla nueva; no modifica ni borra nada existente. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_bitacora_usuarios.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_bitacora_usuarios");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bitacora_usuarios" (
      "id" serial PRIMARY KEY NOT NULL,
      "usuario_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "admin_id" integer REFERENCES "usuarios"("id"),
      "tipo" varchar(30) NOT NULL,
      "detalle" jsonb NOT NULL,
      "fecha" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "bitacora_usuarios_usuario_idx" ON "bitacora_usuarios" ("usuario_id");`);

  console.log("Tabla bitacora_usuarios lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
