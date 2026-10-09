"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarRegistroActividad, enviarSemanaActividades } from "@/app/actions/registrosActividad";
import { leerFuenteImagen, leerOrigenImagen } from "@/lib/fuenteImagen";
import {
  DESCRIPTOR_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  CONCLUSION_MAX_PALABRAS,
} from "@/lib/reglasRegistroActividad";
import { datosCitaVacios, leerDatosCita, type DatosCitaApa } from "@/lib/citaApa";
import { EJEMPLOS_REGISTRO, AVISO_EJEMPLOS } from "@/lib/ejemplosInforme";
import AyudaEjemplo from "@/components/AyudaEjemplo";
import ImagenesActividad from "./ImagenesActividad";
import ComentarioAsesor from "./ComentarioAsesor";
import DeclaracionAutoria from "../../DeclaracionAutoria";
import { leerComentariosSecciones, contarComentarios, OBSERVACIONES_ESTANDAR } from "@/lib/comentariosRevision";
import type { DatosOrigenImagen } from "./OrigenImagenCampos";
import TextoRedaccion from "./TextoRedaccion";
import CitaApaCampos from "./CitaApaCampos";

function formatoFecha(d: string | Date | null) {
  if (!d) return null;
  return new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-SV", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  enviado: { className: "bg-blue-50 border-blue-200 text-blue-900", title: "Esta actividad fue enviada y está en revisión por su asesor designado." },
  observado: { className: "bg-amber-50 border-amber-300 text-amber-900", title: "Su asesor designado solicitó correcciones en esta actividad." },
  aprobado: { className: "bg-emerald-50 border-emerald-200 text-emerald-900", title: "Esta actividad fue revisada y aprobada por su asesor designado." },
};

const tarjeta = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3";
const tituloTarjeta = "text-sm font-extrabold text-slate-900 uppercase tracking-wide";

export default function RegistroActividadClient({ data }: { data: any }) {
  const router = useRouter();
  const { actividad, registro, estadoGrupo, semana } = data;

  const bloqueadaPorSemana = estadoGrupo === "bloqueada";
  // Semana adelantada: se redacta en borrador mientras el asesor revisa la anterior, pero aún no se envía.
  const soloBorrador = estadoGrupo === "adelantada";
  const isLocked = registro.estado === "enviado" || registro.estado === "aprobado" || bloqueadaPorSemana;

  const [descriptor, setDescriptor] = useState(registro.descriptor || "");
  const [marcoTeorico, setMarcoTeorico] = useState(registro.marcoTeorico || "");
  // Referencia por campos; las registradas antes en texto libre se muestran como referencia anterior.
  const [citaDatos, setCitaDatos] = useState<DatosCitaApa>(() => leerDatosCita(registro.citaApaDatos) ?? datosCitaVacios());
  const citaAnterior: string | null = !registro.citaApaDatos && registro.citaApa ? registro.citaApa : null;
  const [conclusionTecnica, setConclusionTecnica] = useState(registro.conclusionTecnica || "");
  const [leyendaImagen, setLeyendaImagen] = useState(registro.leyendaImagen || "");
  const [saving, setSaving] = useState<"borrador" | "siguiente" | "enviar" | null>(null);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [declaracion, setDeclaracion] = useState<"si" | "no" | null>(null);
  const [origenPrincipal, setOrigenPrincipal] = useState<DatosOrigenImagen>({
    origen: leerOrigenImagen(registro.imagenOrigen),
    fuente: leerFuenteImagen(registro.imagenFuente),
  });
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const fechaRegistro = formatoFecha(registro.fecha);
  const siguienteId: number | null = semana?.siguienteId ?? null;
  // En la última actividad de la semana habilitada, el botón principal envía la semana completa al asesor.
  const enviaSemana = !siguienteId && estadoGrupo === "habilitada";

  // Si los campos de la referencia siguen vacíos se conserva la referencia anterior de texto libre.
  const citaUsada = !!(citaDatos.titulo.trim() || citaDatos.autores.some((a) => a.apellidos.trim()) || citaDatos.autorInstitucional.trim());
  const guardar = async () =>
    guardarRegistroActividad(actividad.id, {
      descriptor,
      marcoTeorico,
      citaApaDatos: citaUsada ? citaDatos : null,
      conclusionTecnica,
      leyendaImagen,
      ...(registro.imagenUrl ? { imagenOrigen: origenPrincipal.origen, imagenFuente: origenPrincipal.fuente } : {}),
    });

  const handleGuardar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving("borrador");
    const res = await guardar();
    setSaving(null);
    if (res.success) {
      setOkMsg("Borrador guardado correctamente.");
      router.refresh();
    } else {
      setError(res.error || "No se pudo guardar el borrador.");
    }
  };

  const handleGuardarYContinuar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving("siguiente");
    const res = await guardar();
    if (!res.success) {
      setSaving(null);
      setError(res.error || "No se pudo guardar la actividad.");
      return;
    }
    router.push(siguienteId ? `/egresado/reportes/actividad/${siguienteId}` : "/egresado/reportes");
  };

  const handleGuardarYEnviar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving("enviar");
    const guardado = await guardar();
    if (!guardado.success) {
      setSaving(null);
      setConfirmandoEnvio(false);
      setError(guardado.error || "No se pudo guardar la actividad.");
      return;
    }
    const res = await enviarSemanaActividades(actividad.propuestaId, declaracion === "si");
    setSaving(null);
    setConfirmandoEnvio(false);
    if (res.success) {
      router.push("/egresado/reportes");
    } else {
      setError(res.error || "No se pudo enviar la semana.");
      router.refresh();
    }
  };

  // Comentarios del asesor por apartado: correcciones (semana devuelta) o retroalimentación (semana aprobada).
  const comentariosAsesor =
    registro.estado === "observado" || registro.estado === "aprobado" ? leerComentariosSecciones(registro.comentariosSecciones) : {};
  const observado = registro.estado === "observado";
  const hayComentariosPorApartado = contarComentarios(comentariosAsesor) > 0;

  // Con comentarios por apartado, el recuadro de correcciones ya informa el estado observado.
  const banner =
    bloqueadaPorSemana || soloBorrador || (observado && hayComentariosPorApartado) ? null : ESTADO_BANNER[registro.estado as string];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Registro de actividad</h1>
          {semana && (
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Actividad {semana.posicion} de {semana.total} de la Semana {semana.semana}, Período {semana.periodo}
            </p>
          )}
        </div>
        <Link
          href="/egresado/reportes"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver a la semana
        </Link>
      </div>

      {bloqueadaPorSemana && (
        <div className="p-4 rounded-xl border bg-slate-100 border-slate-300 text-slate-600 text-xs font-bold">
          Esta actividad pertenece a una semana que aún no está habilitada. Las semanas se habilitan conforme su asesor designado
          aprueba la anterior.
        </div>
      )}
      {soloBorrador && (
        <div className="p-4 rounded-xl border bg-slate-50 border-slate-300 text-slate-700 text-xs font-bold">
          Esta semana está disponible solo en borrador. Puede adelantar su redacción mientras su asesor designado revisa la semana
          anterior; podrá enviarla en cuanto sea aprobada.
        </div>
      )}
      {banner && <div className={`p-4 rounded-xl border text-xs font-bold ${banner.className}`}>{banner.title}</div>}

      {hayComentariosPorApartado ? (
        <div className={`p-4 bg-white border-2 rounded-xl space-y-2 ${observado ? "border-amber-300" : "border-slate-200"}`}>
          <h3 className={`text-xs font-extrabold uppercase tracking-wide ${observado ? "text-amber-900" : "text-slate-700"}`}>
            {observado ? "Correcciones solicitadas por su asesor designado" : "Comentarios de su asesor designado"}
          </h3>
          <p className="text-[11px] text-slate-600 font-semibold">
            {contarComentarios(comentariosAsesor)} comentario{contarComentarios(comentariosAsesor) > 1 ? "s" : ""}. Cada uno aparece junto al
            apartado al que se refiere{observado ? "; corríjalos y vuelva a enviar la semana." : "."}
          </p>
          {OBSERVACIONES_ESTANDAR.filter((o) => comentariosAsesor.estandar?.includes(o.id)).map((o) => (
            <div key={o.id} className="p-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 text-amber-950 space-y-0.5">
              <p className="text-xs font-extrabold">{o.label}</p>
              <p className="text-xs font-medium">{o.detalle}</p>
            </div>
          ))}
          <ComentarioAsesor texto={comentariosAsesor.general} observado={observado} />
        </div>
      ) : (
        registro.comentarioAsesor && (
          <div className="p-4 bg-white border-2 border-amber-300 rounded-xl space-y-1.5">
            <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Observaciones del asesor</h3>
            <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{registro.comentarioAsesor}</p>
          </div>
        )
      )}

      {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}
      {okMsg && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">{okMsg}</div>}

      <div className={tarjeta}>
        <h2 className={`${tituloTarjeta} border-b border-slate-100 pb-2`}>Datos de la actividad (cronograma)</h2>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">
          <span className="font-mono text-unicaes">{actividad.codigo}</span> {actividad.titulo || "Sin título"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2"><span className="block text-slate-400 font-bold uppercase text-[10px]">Descripción planificada</span><span className="font-medium text-slate-700">{actividad.descripcion}</span></div>
          <div className="sm:col-span-2">
            <span className="block text-slate-400 font-bold uppercase text-[10px]">Fecha de realización</span>
            <span className="font-bold text-slate-800">{fechaRegistro || "Se registra automáticamente al enviar la semana"}</span>
          </div>
        </div>
      </div>

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Marco teórico correspondiente a la actividad realizada</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Fundamente teóricamente la actividad que realizó.</p>
        </div>
        <ComentarioAsesor texto={comentariosAsesor.marco} marcas={comentariosAsesor.marcas?.filter((m) => m.seccion === "marco")} observado={observado} />
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.marcoTeorico} aviso={AVISO_EJEMPLOS} />
        <TextoRedaccion
          id="marco-teorico"
          valor={marcoTeorico}
          onChange={setMarcoTeorico}
          deshabilitado={isLocked}
          filas={5}
          placeholder="Fundamento teórico que respalda la actividad realizada."
        />
        <div className="space-y-2 pt-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">Referencia (formato APA 7)</h3>
          <CitaApaCampos datos={citaDatos} onChange={setCitaDatos} deshabilitado={isLocked} citaAnterior={citaAnterior} />
        </div>
      </div>

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Descripción de la actividad realizada por el pasante</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Reporte lo que usted realizó, en tiempo pasado (por ejemplo: &quot;El pasante elaboró, revisó, presentó...&quot;). Separe los
            párrafos con un solo Enter.
          </p>
        </div>
        <ComentarioAsesor texto={comentariosAsesor.descripcion} marcas={comentariosAsesor.marcas?.filter((m) => m.seccion === "descripcion")} observado={observado} />
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.descripcion} aviso={AVISO_EJEMPLOS} />
        <TextoRedaccion
          id="descripcion"
          valor={descriptor}
          onChange={setDescriptor}
          deshabilitado={isLocked}
          filas={16}
          placeholder={`Describa lo que usted realizó en esta actividad, en tiempo pasado (${DESCRIPTOR_MIN_PALABRAS} a ${DESCRIPTOR_MAX_PALABRAS} palabras).`}
          minimo={DESCRIPTOR_MIN_PALABRAS}
          maximo={DESCRIPTOR_MAX_PALABRAS}
        />
      </div>

      <ImagenesActividad
        actividadId={actividad.id}
        imagenUrl={registro.imagenUrl}
        numeroImagen={registro.numeroImagen}
        leyenda={leyendaImagen}
        onLeyenda={setLeyendaImagen}
        origenPrincipal={origenPrincipal}
        onOrigenPrincipal={setOrigenPrincipal}
        imagenes={data.imagenes ?? []}
        imagenesSemana={data.imagenesSemana ?? { usadas: 0, limite: 9, faltantesPrincipal: 0 }}
        bloqueado={isLocked}
        onError={setError}
        comentario={<ComentarioAsesor texto={comentariosAsesor.imagenes} observado={observado} />}
      />

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Conclusión técnica de la actividad</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Indique el resultado técnico obtenido y su fundamento. No incluya opiniones ni valoraciones personales.
          </p>
        </div>
        <ComentarioAsesor texto={comentariosAsesor.conclusion} marcas={comentariosAsesor.marcas?.filter((m) => m.seccion === "conclusion")} observado={observado} />
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.conclusion} aviso={AVISO_EJEMPLOS} />
        <TextoRedaccion
          id="conclusion"
          valor={conclusionTecnica}
          onChange={setConclusionTecnica}
          deshabilitado={isLocked}
          filas={4}
          placeholder={`Conclusión técnica derivada de la actividad realizada (${CONCLUSION_MIN_PALABRAS} a ${CONCLUSION_MAX_PALABRAS} palabras).`}
          minimo={CONCLUSION_MIN_PALABRAS}
          maximo={CONCLUSION_MAX_PALABRAS}
        />
      </div>

      {!isLocked && (
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving !== null}
            className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors disabled:opacity-50"
          >
            {saving === "borrador" ? "Guardando..." : "Guardar borrador"}
          </button>
          <button
            type="button"
            onClick={
              enviaSemana
                ? () => {
                    setDeclaracion(null);
                    setConfirmandoEnvio(true);
                  }
                : handleGuardarYContinuar
            }
            disabled={saving !== null}
            className="px-6 py-3 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {saving === "siguiente"
              ? "Guardando..."
              : siguienteId
                ? `Siguiente actividad (${semana.siguienteCodigo})`
                : enviaSemana
                  ? "Enviar semana al asesor"
                  : "Guardar y volver a la semana"}
          </button>
        </div>
      )}
      {!isLocked && (
        <p className="text-right text-[11px] text-slate-500 font-semibold">
          {siguienteId
            ? "Al pasar a la siguiente actividad, esta se guarda como borrador."
            : enviaSemana
              ? "Es la última actividad de la semana: al enviar, todas las actividades de la semana pasan juntas a revisión."
              : soloBorrador
                ? "Podrá enviar esta semana cuando su asesor designado apruebe la anterior."
                : "Las actividades se envían al asesor todas juntas, una vez completadas las de la semana."}
        </p>
      )}
      {isLocked && !bloqueadaPorSemana && siguienteId && (
        <div className="flex justify-end">
          <Link
            href={`/egresado/reportes/actividad/${siguienteId}`}
            className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors"
          >
            Siguiente actividad ({semana.siguienteCodigo})
          </Link>
        </div>
      )}

      {confirmandoEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Enviar la Semana {semana.semana} del Período {semana.periodo}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se guardará esta actividad y se enviarán las {semana.total} actividades de la semana a su asesor designado para su
              revisión. No podrá editarlas mientras estén en revisión. Mientras tanto podrá adelantar el borrador de la semana
              siguiente. La fecha de realización quedará registrada con la fecha de hoy.
            </p>
            <DeclaracionAutoria valor={declaracion} onChange={setDeclaracion} />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmandoEnvio(false)}
                disabled={saving !== null}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarYEnviar}
                disabled={saving !== null || declaracion !== "si"}
                className="px-5 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold disabled:opacity-50"
              >
                {saving === "enviar" ? "Enviando..." : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
