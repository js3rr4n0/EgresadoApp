// Entrega 1 del módulo de fichas: siembra las fichas base (pasantía, proyecto e investigación de la fase 1)
// con su versión 1 habilitada. Si una ficha base ya existe, no la toca. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/sembrar_fichas_base.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { fichas, fichasVersiones } from "../../src/lib/schema";
import { definicionBase, NOMBRES_FICHAS_BASE } from "../../src/lib/fichas/fichasBase";
import { validarDefinicion } from "../../src/lib/fichas/validar";
import type { Modalidad } from "../../src/lib/fichas/tipos";
import { exigirBaseDesarrollo } from "./guardia";

const MODALIDADES: Modalidad[] = ["pasantia", "proyecto", "investigacion"];

async function run() {
  exigirBaseDesarrollo("sembrar_fichas_base");

  for (const modalidad of MODALIDADES) {
    const definicion = definicionBase(modalidad);
    const problemas = validarDefinicion(definicion);
    if (problemas.length > 0) {
      throw new Error(`La ficha base de ${modalidad} no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
    }

    const [existente] = await db
      .select({ id: fichas.id })
      .from(fichas)
      .where(and(eq(fichas.modalidad, modalidad), eq(fichas.esBase, true)));
    if (existente) {
      console.log(`- ${NOMBRES_FICHAS_BASE[modalidad]}: ya existe (ficha ${existente.id}), no se modifica.`);
      continue;
    }

    const [ficha] = await db
      .insert(fichas)
      .values({ nombre: NOMBRES_FICHAS_BASE[modalidad], modalidad, esBase: true })
      .returning({ id: fichas.id });
    await db.insert(fichasVersiones).values({
      fichaId: ficha.id,
      numero: 1,
      estado: "habilitada",
      definicion,
      notas: "Describe el comportamiento de la fase 1.",
      habilitadaEn: new Date(),
    });
    console.log(`+ ${NOMBRES_FICHAS_BASE[modalidad]}: creada (ficha ${ficha.id}, versión 1 habilitada).`);
  }
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error("No se pudieron sembrar las fichas base:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
