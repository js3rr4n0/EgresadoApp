import { getDocumentoInformeFinal } from "@/app/actions/informeFinalFicha";
import DocumentoInformeFinalVista from "@/components/proyecto/DocumentoInformeFinalVista";

export default async function ImprimirInformeFinalAsesor({ params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const res = await getDocumentoInformeFinal(Number(propuestaId));
  if (!res.success) return <p className="p-8 text-center text-sm text-muted">{res.error}</p>;
  return <DocumentoInformeFinalVista doc={res.documento} volver={`/asesor/informe-final/${propuestaId}`} word={`/api/informe-final/${propuestaId}/word`} />;
}
