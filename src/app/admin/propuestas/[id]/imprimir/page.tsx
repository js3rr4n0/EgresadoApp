import Link from "next/link";
import { db } from "@/lib/db";
import {
  propuestas,
  empresas,
  supervisores,
  sucursales,
  cartasAceptacion,
  actividades,
  documentosEgresado,
  usuarios,
  carreras,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getEquipoProyecto, getDetallesProyecto } from "@/app/actions/proyecto";
import { eq, asc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/egresado/redactar/imprimir/PrintButton";
import PdfToImagesViewer from "@/components/PdfToImagesViewer";

const getStaticMapUrl = (coords: string | null) => {
  if (!coords || !coords.includes(",")) return null;
  return `/api/map?coords=${coords}`;
};

export default async function AdminPrintPropuestaPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "decanato")) {
    redirect("/login");
  }

  const pId = parseInt(params.id, 10);
  if (isNaN(pId)) return notFound();

  const [propData] = await db.select().from(propuestas).where(eq(propuestas.id, pId)).limit(1);
  if (!propData) return notFound();

  const propuesta = propData;
  const isProyecto = propuesta.tipo === "proyecto";
  const isInvestigacion = propuesta.tipo === "investigacion";
  const isMultiUserFlow = isProyecto || isInvestigacion;

  // Fetch student info
  const [student] = await db
    .select({
      id: usuarios.id,
      nombreCompleto: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      carrera: carreras.nombre,
    })
    .from(usuarios)
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(eq(usuarios.id, propuesta.egresadoId))
    .limit(1);

  const studentName = student?.nombreCompleto || "Estudiante";
  const carreraNombre = student?.carrera || "Carrera no especificada";

  const dateForMonth = propuesta.enviadaEn ? new Date(propuesta.enviadaEn) : new Date();
  const mesEnvioStr = new Intl.DateTimeFormat("es-SV", { month: "long" }).format(dateForMonth).toUpperCase();

  let empresa: any = null;
  let supervisor: any = null;
  let sucursal: any = null;
  let actividadesList: any[] = [];
  let teamMembers: any[] = [];
  let detallesProj: any = null;

  if (isMultiUserFlow) {
    teamMembers = await getEquipoProyecto(propuesta.id);
    detallesProj = await getDetallesProyecto(propuesta.id);
  } else {
    if (propuesta.empresaId) {
      const res = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId)).limit(1);
      empresa = res[0];
    }

    if (propuesta.supervisorId) {
      const res = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId)).limit(1);
      supervisor = res[0];
    }

    if (propuesta.sucursalId) {
      const res = await db.select().from(sucursales).where(eq(sucursales.id, propuesta.sucursalId)).limit(1);
      sucursal = res[0];
    }

    actividadesList = await db
      .select()
      .from(actividades)
      .where(eq(actividades.propuestaId, propuesta.id))
      .orderBy(asc(actividades.periodo), asc(actividades.numero));
  }

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const formattedDate = `SANTA ANA, ${today.toLocaleDateString("es-SV", options).toUpperCase()}`;

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="mx-auto bg-white p-8 print:p-0" style={{ maxWidth: "800px" }}>
        {/* Helper navigation and print buttons */}
        <div className="mb-8 flex justify-between items-center print:hidden">
          <Link
            href={`/admin/propuestas/${propuesta.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Revisión
          </Link>
          <PrintButton />
        </div>

        {/* ────────────────── PORTADA ────────────────── */}
        <div className="flex flex-col items-center justify-center min-h-[90vh] text-center" style={{ pageBreakAfter: "always" }}>
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-12">UNIVERSIDAD CATÓLICA DE EL SALVADOR</h1>

          <div className="mb-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/unicaes-logo.png" alt="UNICAES" className="w-56 h-56 object-contain mx-auto" />
          </div>

          <h2 className="text-xl font-bold uppercase tracking-wider mb-2">
            HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN
          </h2>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">
            MODALIDAD: {propuesta.tipo.toUpperCase()} (PROPUESTA #{propuesta.numero})
          </p>

          <div className="mb-8 p-4 bg-gray-50 border border-gray-300 rounded-lg max-w-xl mx-auto w-full text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              TÍTULO DE LA PROPUESTA:
            </p>
            <h3 className="text-base font-extrabold text-gray-900 uppercase leading-snug">
              {propuesta.titulo || `Propuesta #${propuesta.numero}`}
            </h3>
          </div>

          <div className="mb-12 space-y-3">
            <h3 className="text-lg font-bold text-gray-900 uppercase">
              {isMultiUserFlow ? (isInvestigacion ? "INVESTIGADOR PRINCIPAL: " : "LÍDER DE PROYECTO: ") : "ESTUDIANTE: "} {studentName} ({student?.carnet || "N/A"})
            </h3>

            <p className="text-sm font-semibold text-gray-700 uppercase">
              <strong>TÍTULO AL QUE SE OPTA / CARRERA:</strong> {carreraNombre}
            </p>
          </div>

          <div className="mt-auto font-bold text-sm text-gray-600 space-y-1">
            <p>FECHA DE ENVÍO: {mesEnvioStr} DE {dateForMonth.getFullYear()}</p>
            <p>{formattedDate}</p>
          </div>
        </div>

        {/* ────────────────── CONTENIDO PROYECTO / PASANTÍA ────────────────── */}
        <div className="py-8 space-y-8">
          <section className="border-b pb-6">
            <h3 className="text-lg font-bold uppercase text-brand-red mb-4">Información de la Propuesta</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Nº Propuesta:</strong> #{propuesta.numero}</div>
              <div><strong>Tipo:</strong> {propuesta.tipo.toUpperCase()}</div>
              <div><strong>Estado:</strong> {propuesta.estado.toUpperCase()}</div>
              <div><strong>Estudiante Principal:</strong> {studentName} ({student?.carnet || "N/A"})</div>
            </div>
          </section>

          {isMultiUserFlow && detallesProj && (
            <section className="border-b pb-6 space-y-4">
              <h3 className="text-lg font-bold uppercase text-brand-red">Detalles del Proyecto / Investigación</h3>
              <div>
                <strong>Título:</strong>
                <p className="text-sm text-gray-800 mt-1">{detallesProj.titulo}</p>
              </div>
              {detallesProj.descripcionProblema && (
                <div>
                  <strong>Descripción del Problema:</strong>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{detallesProj.descripcionProblema}</p>
                </div>
              )}
              {detallesProj.justificacion && (
                <div>
                  <strong>Justificación:</strong>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{detallesProj.justificacion}</p>
                </div>
              )}
              {detallesProj.alcances && (
                <div>
                  <strong>Alcance y Limites:</strong>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{detallesProj.alcances}</p>
                </div>
              )}
            </section>
          )}

          {!isMultiUserFlow && empresa && (
            <section className="border-b pb-6 space-y-3">
              <h3 className="text-lg font-bold uppercase text-brand-red">Datos de la Empresa</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Empresa:</strong> {empresa.nombre}</div>
                <div><strong>Área:</strong> {empresa.area || "N/A"}</div>
                <div><strong>Dirección:</strong> {empresa.direccion || "N/A"}</div>
                <div><strong>Sede/Sucursal:</strong> {sucursal?.nombre || "Sede Central"}</div>
              </div>
            </section>
          )}

          {/* DOCUMENTOS ADJUNTOS */}
          {docs.length > 0 && (
            <section className="pt-6 space-y-6">
              <h3 className="text-lg font-bold uppercase text-brand-red border-b pb-2">Documentos Anexos del Estudiante</h3>
              {docs.map((d) => (
                <div key={d.id} className="space-y-2">
                  <PdfToImagesViewer url={d.archivoUrl} title={d.tipo.toUpperCase().replace("_", " ")} />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
