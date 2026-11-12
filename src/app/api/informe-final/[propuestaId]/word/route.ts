import { getDocumentoInformeFinal } from "@/app/actions/informeFinalFicha";
import { generarInformeFinalFichaWord } from "@/lib/informeFinalFichaWord";

/** Word del informe final de investigación (entrega I5). Los permisos son los de la pantalla (equipo y asesor). */
export async function GET(_request: Request, { params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isInteger(id)) return new Response("Propuesta no válida.", { status: 400 });
  const res = await getDocumentoInformeFinal(id);
  if (!res.success) return new Response(res.error, { status: 403 });
  const archivo = await generarInformeFinalFichaWord(res.documento);
  const sufijo = res.documento.estado === "redactando" ? "_borrador" : "";
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Informe_Final_Investigacion_${id}${sufijo}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
