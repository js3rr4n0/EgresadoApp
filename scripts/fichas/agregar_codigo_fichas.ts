// Agrega la columna fichas.codigo (identificador automático MOD-FAC-NNN[-CAR]) y asigna código a las fichas que
// no lo tienen: las fichas base reciben MOD-BASE; las demás, el siguiente correlativo de su modalidad y facultad.
// Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/agregar_codigo_fichas.ts
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { carreras, facultades, fichas } from "../../src/lib/schema";
import { armarCodigo, prefijoModalidad, raizCodigo, siguienteCorrelativo } from "../../src/lib/fichas/codigo";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("agregar_codigo_fichas");

  await db.execute(sql`ALTER TABLE "fichas" ADD COLUMN IF NOT EXISTS "codigo" varchar(40);`);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichas_codigo_unique') THEN
        ALTER TABLE "fichas" ADD CONSTRAINT "fichas_codigo_unique" UNIQUE ("codigo");
      END IF;
    END $$;
  `);

  const todas = await db
    .select({ ficha: fichas, codFacultad: facultades.codigo, codCarrera: carreras.codigo })
    .from(fichas)
    .leftJoin(facultades, eq(fichas.facultadId, facultades.id))
    .leftJoin(carreras, eq(fichas.carreraId, carreras.id))
    .orderBy(asc(fichas.id));
  const codigos = todas.map((f) => f.ficha.codigo);

  for (const { ficha, codFacultad, codCarrera } of todas) {
    if (ficha.codigo) continue;
    const codigo = ficha.esBase
      ? `${prefijoModalidad(ficha.modalidad)}-BASE`
      : (() => {
          const raiz = raizCodigo(ficha.modalidad, codFacultad);
          return armarCodigo(raiz, siguienteCorrelativo(raiz, codigos), codCarrera);
        })();
    await db.update(fichas).set({ codigo }).where(eq(fichas.id, ficha.id));
    codigos.push(codigo);
    console.log(`Ficha ${ficha.id} (${ficha.nombre}): ${codigo}`);
  }
  console.log("Columna codigo lista.");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error("No se pudo agregar el código:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
