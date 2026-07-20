import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { propuestaId, supervisorId } = await req.json();

    if (!propuestaId || !supervisorId) {
      return NextResponse.json({ success: false, error: "Faltan datos obligatorios" }, { status: 400 });
    }

    await db.update(propuestas)
      .set({ supervisorId })
      .where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving supervisor:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
