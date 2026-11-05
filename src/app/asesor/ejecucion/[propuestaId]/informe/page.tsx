import InformePeriodoProyecto from "@/components/proyecto/InformePeriodoProyecto";

export default async function InformePeriodoAsesorPage({ params, searchParams }: { params: Promise<{ propuestaId: string }>; searchParams: Promise<{ periodo?: string; de?: string }> }) {
  const { propuestaId } = await params;
  const { periodo, de } = await searchParams;
  return <InformePeriodoProyecto propuestaId={Number(propuestaId)} periodo={Number(periodo ?? 1)} de={de ?? "general"} volver={`/asesor/ejecucion/${propuestaId}`} />;
}
