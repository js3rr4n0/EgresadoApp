import { getDocumentoProtocolo } from "@/app/actions/protocolo";
import DocumentoInformeFinalVista from "@/components/proyecto/DocumentoInformeFinalVista";

// Vista de impresión del protocolo (ajustes al protocolo, 19-nov-2026): con "Imprimir / PDF" se guarda como PDF.
export default async function ImprimirProtocoloEgresado({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const res = await getDocumentoProtocolo(Number(id));
  if (!res.success) return <p className="p-8 text-center text-sm text-muted">{res.error}</p>;
  return <DocumentoInformeFinalVista doc={res.documento} volver={`/egresado/plan?id=${id}&tab=protocolo`} volverTexto="Volver al protocolo" word={`/api/protocolo/${id}/word`} />;
}
