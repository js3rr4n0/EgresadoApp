"use client";

// Configuración de una cohorte (entrega C1): resumen, copiar de la cohorte anterior, una tarjeta por facultad y la
// bitácora de cambios.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copiarConfiguracion } from "@/app/actions/configCohorte";
import type { DatosConfiguracion } from "@/lib/configCohorteServidor";
import { validarConfig } from "@/lib/configCohorte";
import TarjetaFacultad from "./TarjetaFacultad";
import { fechaLargaSV, horaSV } from "@/lib/fechasTexto";
import DialogoJustificacion from "./DialogoJustificacion";

// Mismo texto en servidor y navegador (evita errores de hidratación)
const fecha = fechaLargaSV;
const hora = horaSV;

function Indicador({ etiqueta, valor, detalle, alerta }: { etiqueta: string; valor: number | string; detalle?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${alerta ? "border-amber-300" : "border-border"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{etiqueta}</p>
      <p className={`text-2xl font-bold ${alerta ? "text-amber-700" : "text-gray-800"}`}>{valor}</p>
      {detalle && <p className="text-[11px] text-muted">{detalle}</p>}
    </div>
  );
}

export default function ConfiguracionCohorte({ datos, iniciada }: { datos: DatosConfiguracion; iniciada: boolean }) {
  const router = useRouter();
  const [copiando, setCopiando] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nombres = useMemo(() => {
    const usuarios: Record<number, string> = {};
    [...datos.admins, ...datos.coordinadores, ...datos.asesores].forEach((u) => (usuarios[u.id] = u.nombre));
    const carreras: Record<number, string> = {};
    datos.facultades.forEach((f) => f.carreras.forEach((c) => (carreras[c.id] = c.nombre)));
    return { usuarios, carreras };
  }, [datos]);

  const resumen = useMemo(() => {
    const conf = datos.facultades.filter((f) => f.config);
    const n = { usuario: (id: number) => nombres.usuarios[id] ?? "", carrera: (id: number) => nombres.carreras[id] ?? "" };
    return {
      configuradas: conf.length,
      conAdmin: conf.filter((f) => f.config!.administracion === "facultad").length,
      sinCoordinador: conf.filter((f) => f.config!.coordinacion === "sin_coordinador").length,
      porCarrera: conf.filter((f) => f.config!.coordinacion === "por_carrera").length,
      avisos: conf.reduce((s, f) => s + validarConfig(f.config!, f.carreras.map((c) => c.id), n).avisos.length, 0),
    };
  }, [datos, nombres]);

  const copiar = async (justificacion: string | null) => {
    if (!datos.anterior) return;
    if (!pidiendo && resumen.configuradas > 0 && !confirm(`Se reemplaza la configuración de las facultades que estén configuradas en ${datos.anterior.nombre}; las demás no cambian. ¿Continuar?`)) return;
    setCopiando(true);
    setError(null);
    const res = await copiarConfiguracion(datos.periodo.id, datos.anterior.id, justificacion);
    setCopiando(false);
    if (!res.success) {
      if (res.pideJustificacion) setPidiendo(true);
      setError(res.error);
      return;
    }
    setPidiendo(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/periodos" className="text-sm font-semibold text-muted hover:text-brand-red transition-colors">Volver a Fechas y Periodos</Link>
        <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración de la cohorte {datos.periodo.nombre}</h1>
            <p className="text-sm text-muted mt-1">
              Quién administra cada facultad, si tiene coordinadores y cuáles, y qué asesores participan en esta cohorte.
            </p>
          </div>
          {datos.anterior && (
            <button
              type="button"
              onClick={() => (iniciada ? setPidiendo(true) : copiar(null))}
              disabled={copiando}
              className="shrink-0 px-4 py-2 rounded-xl border border-border bg-white text-sm font-bold text-gray-700 hover:border-brand-red hover:text-brand-red disabled:opacity-50"
            >
              {copiando ? "Copiando..." : `Copiar configuración de ${datos.anterior.nombre}`}
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${iniciada ? "border-brand-red/30 bg-red-50/40 text-gray-800" : "border-border bg-white text-gray-700"}`}>
        {iniciada
          ? <>La cohorte inició el <b>{fecha(datos.periodo.inicioRecepcion)}</b>. Cada cambio pide confirmación y justificación, y no modifica las propuestas ya asignadas.</>
          : <>La cohorte inicia el <b>{fecha(datos.periodo.inicioRecepcion)}</b>. Hasta esa fecha los cambios se guardan sin justificación.</>}
      </div>
      {error && !pidiendo && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Indicador etiqueta="Facultades configuradas" valor={`${resumen.configuradas} de ${datos.facultades.length}`} alerta={resumen.configuradas < datos.facultades.length} />
        <Indicador etiqueta="Con administrador propio" valor={resumen.conAdmin} detalle="Las demás, administración central" />
        <Indicador etiqueta="Sin coordinador" valor={resumen.sinCoordinador} detalle="Asignación directa de asesor" />
        <Indicador etiqueta="Coordinador por carrera" valor={resumen.porCarrera} />
        <Indicador etiqueta="Avisos" valor={resumen.avisos} detalle="Carreras sin coordinador, sin asesores..." alerta={resumen.avisos > 0} />
      </div>

      <div className="space-y-4">
        {datos.facultades.map((f) => (
          <TarjetaFacultad
            key={`${f.id}-${f.actualizadoEn ?? "nueva"}`}
            periodoId={datos.periodo.id}
            facultad={f}
            admins={datos.admins}
            coordinadores={datos.coordinadores}
            asesores={datos.asesores}
            nombres={nombres}
            iniciada={iniciada}
          />
        ))}
      </div>

      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <header className="px-5 py-3 border-b border-border bg-gray-50 flex items-baseline justify-between">
          <h2 className="font-bold text-card-dark">Bitácora de la configuración</h2>
          <span className="text-xs text-muted">Del más reciente al más antiguo</span>
        </header>
        <div className="p-5">
          {datos.bitacora.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay cambios registrados.</p>
          ) : (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {datos.bitacora.map((e) => (
                <li key={e.id} className="pl-5 relative">
                  <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${e.justificacion ? "bg-brand-red" : "bg-gray-400"}`} />
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-bold text-sm text-gray-800">{e.facultad ?? "Cohorte"}</span>
                    <span className="text-xs text-muted">{fecha(e.fecha)}, {hora(e.fecha)}{e.autor ? ` · ${e.autor}` : ""}</span>
                  </div>
                  <ul className="text-sm text-gray-600 mt-1 list-disc pl-5 space-y-0.5">
                    {e.cambios.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                  {e.justificacion && (
                    <div className="text-sm text-gray-800 bg-gray-50 border border-border rounded-lg p-3 mt-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">Justificación</span>
                      {e.justificacion}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {pidiendo && datos.anterior && (
        <DialogoJustificacion
          titulo={`Copiar la configuración de ${datos.anterior.nombre} (solo las facultades configuradas allí)`}
          cambios={[]}
          guardando={copiando}
          error={error}
          onConfirmar={(j) => copiar(j)}
          onCancelar={() => { setPidiendo(false); setError(null); }}
        />
      )}
    </div>
  );
}
