import { getDocumentoInformeFinal } from "@/app/actions/informeFinalFicha";
import DocumentoInformeFinalVista from "@/components/proyecto/DocumentoInformeFinalVista";

export default async function ImprimirInformeFinalEgresado({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const res = await getDocumentoInformeFinal(Number(id));
  if (!res.success) return <p className="p-8 text-center text-sm text-muted">{res.error}</p>;
  return <DocumentoInformeFinalVista doc={res.documento} volver={`/egresado/informe-final?id=${id}`} word={`/api/informe-final/${id}/word`} />;
}
