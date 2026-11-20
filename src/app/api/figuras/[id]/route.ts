import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { figurasDocumento } from "@/lib/schema";
import { getPlanTrabajo } from "@/app/actions/planTrabajo";

/** Imagen de una figura (entrega F2). La ven quienes ven el plan de la propuesta: el equipo, el asesor y la coordinación. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Figura no válida.", { status: 400 });
  const [fila] = await db.select().from(figurasDocumento).where(eq(figurasDocumento.id, id));
  if (!fila) return new Response("La figura no existe.", { status: 404 });
  const acceso = await getPlanTrabajo(fila.propuestaId);
  if (!acceso.success) return new Response("No autorizado.", { status: 403 });
  const m = /^data:([^;]+);base64,(.*)$/.exec(fila.url);
  if (!m) return new Response("Formato no válido.", { status: 500 });
  return new Response(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=3600" },
  });
}
