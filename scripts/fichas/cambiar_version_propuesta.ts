// Pasa una propuesta a otra versión de su ficha (solo base de desarrollo). Sirve para que un trabajo en curso tome una
// etapa que su versión no tenía, por ejemplo el informe final de proyecto (H7). Solo lo hace si la propuesta, el
// protocolo, el plan y la ejecución de las dos versiones son idénticos: así no cambia nada de lo que el equipo ya hizo.
// Sin --aplicar solo muestra lo que haría.
// Uso: npx tsx --env-file=.env.local scripts/fichas/cambiar_version_propuesta.ts --propuesta <id> --version <id> [--aplicar]
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { fichasVersiones, historialEstados, propuestas } from "../../src/lib/schema";
import type { DefinicionFicha } from "../../src/lib/fichas/tipos";
import { exigirBaseDesarrollo } from "./guardia";

const arg = (nombre: string) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? Number(process.argv[i + 1]) : NaN;
};

/** Etapas que deben coincidir: todo lo anterior al informe final. */
const COMPARADAS = ["propuesta", "protocolo", "plan", "ejecucion"];
const etapas = (d: DefinicionFicha) => JSON.stringify({ p: d.participantes, e: d.etapas.filter((e) => COMPARADAS.includes(e.tipo)) });

async function run() {
  exigirBaseDesarrollo("cambiar_version_propuesta");
  const propuestaId = arg("--propuesta");
  const versionId = arg("--version");
  if (!Number.isInteger(propuestaId) || !Number.isInteger(versionId)) throw new Error("Indica --propuesta <id> y --version <id>.");

  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop?.fichaVersionId) throw new Error(`La propuesta ${propuestaId} no existe o no tiene ficha.`);
  const [actual] = await db.select().from(fichasVersiones).where(eq(fichasVersiones.id, prop.fichaVersionId));
  const [nueva] = await db.select().from(fichasVersiones).where(eq(fichasVersiones.id, versionId));
  if (!nueva) throw new Error(`La versión ${versionId} no existe.`);
  if (nueva.fichaId !== actual.fichaId) throw new Error("La versión nueva es de otra ficha.");
  if (nueva.estado !== "habilitada") throw new Error("La versión nueva no está habilitada.");
  if (etapas(actual.definicion as DefinicionFicha) !== etapas(nueva.definicion as DefinicionFicha)) {
    throw new Error("La propuesta, el protocolo, el plan o la ejecución no son idénticos en las dos versiones: no se cambia.");
  }
  const tipos = (d: DefinicionFicha) => d.etapas.map((e) => e.tipo).join(", ");
  console.log(`Propuesta ${propuestaId}: versión ${actual.numero} (${tipos(actual.definicion as DefinicionFicha)}) → versión ${nueva.numero} (${tipos(nueva.definicion as DefinicionFicha)}).`);
  if (!process.argv.includes("--aplicar")) return console.log("Sin cambios (agrega --aplicar para hacerlo).");
  await db.update(propuestas).set({ fichaVersionId: versionId }).where(eq(propuestas.id, propuestaId));
  await db.insert(historialEstados).values({ propuestaId, de: prop.estado, a: `ficha_version:${nueva.numero}`, usuarioId: prop.coordinadorId });
  console.log("Hecho.");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
