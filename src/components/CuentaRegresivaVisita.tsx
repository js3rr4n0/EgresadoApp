import { formatearFechaLarga } from "@/lib/periodosPasantia";
import { DIA_INICIO_VISITA, DIA_FIN_VISITA, type cuentaRegresivaVisita } from "@/lib/formularioVisita";

type Cuenta = NonNullable<ReturnType<typeof cuentaRegresivaVisita>>;

/** Estilo de la cuenta regresiva: se intensifica a medida que se acerca o vence el plazo de la visita. */
function estilo(c: Cuenta) {
  if (c.estado === "completada") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (c.estado === "vencida") return "bg-red-100 border-red-300 text-red-900";
  if (c.estado === "en_curso") return "bg-red-50 border-red-200 text-red-800";
  if (c.dias <= 7) return "bg-amber-100 border-amber-300 text-amber-950";
  if (c.dias <= 14) return "bg-amber-50 border-amber-200 text-amber-900";
  return "bg-slate-50 border-slate-200 text-slate-700";
}

/**
 * Cuenta regresiva de la visita del asesor a la empresa, que debe realizarse entre los días 90 y 100 después del inicio
 * de la pasantía (documentación oficial).
 */
export default function CuentaRegresivaVisita({ cuenta, compacta = false }: { cuenta: Cuenta; compacta?: boolean }) {
  const titulo =
    cuenta.estado === "completada"
      ? "Visita registrada"
      : cuenta.estado === "vencida"
        ? "Plazo de visita vencido"
        : cuenta.estado === "en_curso"
          ? "Período de visita en curso"
          : "Días para realizar la visita";
  const detalle =
    cuenta.estado === "completada"
      ? "El informe de visita está completado."
      : cuenta.estado === "vencida"
        ? `Venció hace ${cuenta.dias} día${cuenta.dias === 1 ? "" : "s"}. Realice la visita lo antes posible.`
        : cuenta.estado === "en_curso"
          ? cuenta.dias === 0
            ? "Hoy es el último día para realizarla."
            : `Quedan ${cuenta.dias} día${cuenta.dias === 1 ? "" : "s"} para realizarla.`
          : `Faltan ${cuenta.dias} día${cuenta.dias === 1 ? "" : "s"} para que inicie el período de visita.`;
  const numero = cuenta.estado === "completada" ? null : cuenta.dias;

  return (
    <div className={`rounded-xl border ${compacta ? "p-2.5" : "p-4"} ${estilo(cuenta)}`}>
      <div className="flex items-center gap-3">
        {numero !== null && (
          <span className={`font-extrabold leading-none tabular-nums ${compacta ? "text-2xl" : "text-3xl"}`}>
            {cuenta.estado === "vencida" ? `+${numero}` : numero}
          </span>
        )}
        <div className="min-w-0">
          <p className={`font-extrabold uppercase tracking-wide ${compacta ? "text-[10px]" : "text-[11px]"}`}>{titulo}</p>
          <p className={`font-semibold ${compacta ? "text-[10px]" : "text-[11px]"}`}>{detalle}</p>
        </div>
      </div>
      <p className={`mt-1.5 font-medium opacity-80 ${compacta ? "text-[10px]" : "text-[11px]"}`}>
        Del {formatearFechaLarga(cuenta.desde)} al {formatearFechaLarga(cuenta.hasta)} (días {DIA_INICIO_VISITA} a {DIA_FIN_VISITA} de la
        pasantía).
      </p>
    </div>
  );
}
