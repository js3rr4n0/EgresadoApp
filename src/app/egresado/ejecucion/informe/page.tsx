import InformePeriodoProyecto from "@/components/proyecto/InformePeriodoProyecto";

export default async function InformePeriodoEgresadoPage({ searchParams }: { searchParams: Promise<{ id?: string; periodo?: string; de?: string }> }) {
  const { id, periodo, de } = await searchParams;
  return <InformePeriodoProyecto propuestaId={Number(id)} periodo={Number(periodo ?? 1)} de={de ?? "general"} volver="/egresado/ejecucion" />;
}
