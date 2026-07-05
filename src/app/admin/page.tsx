import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { usuarios, facultades, carreras, propuestas } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import DashboardCharts from "@/components/DashboardCharts";

export default async function AdminDashboard() {
  const session = await getSession();

  // Fecha actual en español
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const todayStr = new Date().toLocaleDateString('es-ES', dateOptions);
  const formattedDate = todayStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Fetch real data
  const [usuariosActivosRes] = await db.select({ count: count() }).from(usuarios).where(eq(usuarios.activo, true));
  const [asesoresRes] = await db.select({ count: count() }).from(usuarios).where(eq(usuarios.rol, "asesor"));
  const [facultadesRes] = await db.select({ count: count() }).from(facultades);
  const [carrerasRes] = await db.select({ count: count() }).from(carreras);

  // Stats by state
  const propuestasRaw = await db
    .select({
      estado: propuestas.estado,
      count: count(),
    })
    .from(propuestas)
    .groupBy(propuestas.estado);

  // Normalizar los datos para los gráficos
  const estadoMap: Record<string, number> = {
    redactando: 0,
    enviada: 0,
    rechazada: 0,
    aprobada: 0,
    en_progreso: 0,
    finalizada: 0,
    abandono: 0,
  };

  propuestasRaw.forEach(p => {
    estadoMap[p.estado] = p.count;
  });

  // Los labels según el diseño: Borrador, Enviada, Rechazada, Aprobada, Progreso, Finalizada, Abandono
  const chartData = [
    { name: "Borrador", value: estadoMap["redactando"] || 0, fill: "#9CA3AF" }, // slate-400
    { name: "Enviada", value: estadoMap["enviada"] || 0, fill: "#3B82F6" }, // blue-500
    { name: "Rechazada", value: estadoMap["rechazada"] || 0, fill: "#EF4444" }, // red-500
    { name: "Aprobada", value: estadoMap["aprobada"] || 0, fill: "#10B981" }, // emerald-500
    { name: "En Progreso", value: estadoMap["en_progreso"] || 0, fill: "#B91C1C" }, // red-700
    { name: "Finalizada", value: estadoMap["finalizada"] || 0, fill: "#059669" }, // emerald-600
    { name: "Abandono", value: estadoMap["abandono"] || 0, fill: "#1F2937" }, // gray-800
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-red">
          Panel de Administración
        </h1>
        <p className="text-muted text-sm mt-1 capitalize">
          Hoy Es {formattedDate}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-muted mb-0.5">Usuarios Activos</p>
            <p className="text-2xl font-black text-card-dark">{usuariosActivosRes.count}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mt-1">Registrados en sistema</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 11l2 2 4-4" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-muted mb-0.5">Total Asesores</p>
            <p className="text-2xl font-black text-card-dark">{asesoresRes.count}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mt-1">Docentes Guía</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-muted mb-0.5">Facultades</p>
            <p className="text-2xl font-black text-card-dark">{facultadesRes.count}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mt-1">Áreas Académicas</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-muted mb-0.5">Carreras</p>
            <p className="text-2xl font-black text-card-dark">{carrerasRes.count}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mt-1">Oferta Académica</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts chartData={chartData} />
    </div>
  );
}
