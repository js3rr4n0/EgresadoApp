import PaginaValoraciones from "@/components/valoraciones/PaginaValoraciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Valoraciones del proceso" };

export default async function ValoracionesAsesorPage({ params }: { params: Promise<{ propuestaId: string }> }) {
  return <PaginaValoraciones rol="asesor" propuestaId={Number((await params).propuestaId)} />;
}
