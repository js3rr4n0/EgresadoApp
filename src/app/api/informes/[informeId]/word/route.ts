import { getInformeCompilado } from "@/app/actions/informeCompilado";
import { generarInformeWord, type InformeCompilado } from "@/lib/informeWord";

export async function GET(_request: Request, { params }: { params: Promise<{ informeId: string }> }) {
  const { informeId } = await params;
  const id = Number(informeId);
  if (!Number.isFinite(id)) {
    return new Response("Informe no válido.", { status: 400 });
  }

  const res = await getInformeCompilado(id);
  if (!res.success || !res.informe || !res.semanas) {
    const status = res.error === "No autenticado" ? 401 : res.error === "Informe no encontrado" ? 404 : 403;
    return new Response(res.error || "No se pudo generar el informe.", { status });
  }

  const informe = res as InformeCompilado;
  const archivo = await generarInformeWord(informe);
  const carnet = (informe.egresado?.carnet || "egresado").replace(/[^A-Za-z0-9-]/g, "");
  const nombre = `Informe_Mensual_${informe.informe.numero}_${carnet}.docx`;

  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
