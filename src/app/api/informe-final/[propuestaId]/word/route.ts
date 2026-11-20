import { getDocumentoInformeFinal } from "@/app/actions/informeFinalFicha";
import { generarInformeFinalFichaWord } from "@/lib/informeFinalFichaWord";

/** Word del informe final (investigación, I5; proyecto, H7). Los permisos son los de la pantalla (equipo y asesor). */
export async function GET(_request: Request, { params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isInteger(id)) return new Response("Propuesta no válida.", { status: 400 });
  const res = await getDocumentoInformeFinal(id);
  if (!res.success) return new Response(res.error, { status: 403 });
  const archivo = await generarInformeFinalFichaWord(res.documento);
  const sufijo = res.documento.estado === "redactando" ? "_borrador" : "";
  // "Informe final del proyecto" → Informe_final_del_proyecto (sin tildes ni espacios).
  const nombre = (res.documento.nombre ?? "Informe final").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_");
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}_${id}${sufijo}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
