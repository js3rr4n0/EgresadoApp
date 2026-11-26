import PaginaValoraciones from "@/components/valoraciones/PaginaValoraciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Valoraciones del proceso" };

export default async function ValoracionesEgresadoPage({ params }: { params: Promise<{ propuestaId: string }> }) {
  return <PaginaValoraciones rol="egresado" propuestaId={Number((await params).propuestaId)} />;
}
