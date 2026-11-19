import { getDocumentoProtocolo } from "@/app/actions/protocolo";
import DocumentoInformeFinalVista from "@/components/proyecto/DocumentoInformeFinalVista";

// Vista de impresión del protocolo para el asesor (ajustes al protocolo, 19-nov-2026).
export default async function ImprimirProtocoloAsesor({ params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const res = await getDocumentoProtocolo(Number(propuestaId));
  if (!res.success) return <p className="p-8 text-center text-sm text-muted">{res.error}</p>;
  return <DocumentoInformeFinalVista doc={res.documento} volver={`/asesor/plan/${propuestaId}`} volverTexto="Volver al protocolo" word={`/api/protocolo/${propuestaId}/word`} />;
}
