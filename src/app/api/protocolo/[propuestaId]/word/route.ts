import { getDocumentoProtocolo } from "@/app/actions/protocolo";
import { generarInformeFinalFichaWord } from "@/lib/informeFinalFichaWord";

/** Word del protocolo de investigación (ajustes al protocolo, 19-nov-2026), con el formato del informe final. */
export async function GET(_request: Request, { params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isInteger(id)) return new Response("Propuesta no válida.", { status: 400 });
  const res = await getDocumentoProtocolo(id);
  if (!res.success) return new Response(res.error, { status: 403 });
  const archivo = await generarInformeFinalFichaWord(res.documento);
  const sufijo = res.documento.estado === "redactando" ? "_borrador" : "";
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Protocolo_Investigacion_${id}${sufijo}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
