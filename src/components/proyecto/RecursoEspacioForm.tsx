"use client";

// Paso de la ficha con un elemento "recurso" (catálogo ampliado, parte 1): imagen, archivo, enlace o lista. Mismo
// marco que TextoEspacioForm (título, ayuda, guardar y continuar); las reglas salen del espacio de la ficha y el
// servidor las valida otra vez (respuestasEspacios.ts). La respuesta se guarda como JSON en respuestas_espacios.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { agregarArchivoEspacio, guardarRespuestaRecurso, quitarArchivoEspacio } from "@/app/actions/respuestasEspacios";
import {
  leerItems,
  limitesRecurso,
  problemasRecurso,
  reglasRecurso,
  TIPOS_ARCHIVO,
  type ArchivoEspacio,
  type ElementoRecurso,
  type EnlaceEspacio,
  type ImagenEspacio,
} from "@/lib/fichas/elementosRecurso";
import type { Espacio } from "@/lib/fichas/tipos";
import OrigenImagenCampos, { type DatosOrigenImagen } from "@/app/egresado/reportes/actividad/[actividadId]/OrigenImagenCampos";
import { notaImagen, validarOrigenImagen } from "@/lib/fuenteImagen";
import { MAX_CARACTERES_LEYENDA } from "@/lib/reglasRegistroActividad";
import { reducirImagen } from "@/lib/reducirImagen";
import { openDocument } from "@/lib/pdfViewer";

interface Props {
  propuestaId: number;
  espacio: Espacio & { elemento: ElementoRecurso };
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
  pasoSiguiente: number;
  pasoAnterior: number | null;
}

const campo = "w-full p-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75";

export default function RecursoEspacioForm({ propuestaId, espacio, initialData, isLocked, isReadOnly = false, pasoSiguiente, pasoAnterior }: Props) {
  const router = useRouter();
  const disabled = isLocked || isReadOnly;
  const items = leerItems(espacio.elemento, initialData);
  const { max } = limitesRecurso(espacio);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Enlaces y lista se editan en el formulario y se guardan juntos.
  const [enlaces, setEnlaces] = useState<EnlaceEspacio[]>(espacio.elemento === "enlace" ? (items as EnlaceEspacio[]) : []);
  const [lista, setLista] = useState<string[]>(espacio.elemento === "lista" ? (items as string[]) : []);
  // Imagen o archivo: se agregan de a uno.
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyenda, setLeyenda] = useState("");
  const [origen, setOrigen] = useState<DatosOrigenImagen>({ origen: null, fuente: null });
  const [inputKey, setInputKey] = useState(0);

  const editable = espacio.elemento === "enlace" || espacio.elemento === "lista";
  const actuales = espacio.elemento === "enlace" ? enlaces : espacio.elemento === "lista" ? lista : items;
  const problemas = problemasRecurso(espacio, actuales);
  const pedirOrigen = espacio.parametros.pedirOrigen !== false;
  const permitidos = (Array.isArray(espacio.parametros.tipos) ? espacio.parametros.tipos : ["pdf"]) as string[];
  const accept = espacio.elemento === "imagen" ? "image/png,image/jpeg" : TIPOS_ARCHIVO.filter((t) => permitidos.includes(t.valor)).flatMap((t) => t.mime).join(",");

  const terminar = (ok: string, avanzar: boolean) => {
    setSuccess(ok);
    if (avanzar) router.push(`?id=${propuestaId}&step=${pasoSiguiente}`);
    router.refresh();
  };

  async function guardar(avanzar: boolean) {
    setError(null);
    setSuccess(null);
    if (avanzar && problemas.length > 0) return setError(problemas[0]);
    setPending(true);
    if (editable) {
      const res = await guardarRespuestaRecurso(propuestaId, espacio.id, espacio.elemento === "enlace" ? enlaces : lista);
      setPending(false);
      if (!res.success) return setError(res.error);
      return terminar(`${espacio.titulo} guardado correctamente.`, avanzar);
    }
    setPending(false);
    terminar(`${espacio.titulo} guardado correctamente.`, avanzar);
  }

  async function adjuntar() {
    if (!archivo) return;
    setError(null);
    setSuccess(null);
    setPending(true);
    const fd = new FormData();
    fd.set("archivo", espacio.elemento === "imagen" ? await reducirImagen(archivo, "imagen.jpg") : archivo);
    if (espacio.elemento === "imagen") {
      fd.set("leyenda", leyenda.trim());
      fd.set("origen", origen.origen ?? "");
      fd.set("fuente", JSON.stringify(origen.fuente));
    }
    const res = await agregarArchivoEspacio(propuestaId, espacio.id, fd);
    setPending(false);
    if (!res.success) return setError(res.error);
    setArchivo(null);
    setLeyenda("");
    setOrigen({ origen: null, fuente: null });
    setInputKey((k) => k + 1);
    terminar("Archivo adjuntado.", false);
  }

  async function quitar(i: number) {
    if (!window.confirm("¿Quitar este archivo del paso?")) return;
    setPending(true);
    const res = await quitarArchivoEspacio(propuestaId, espacio.id, i);
    setPending(false);
    if (!res.success) return setError(res.error);
    terminar("Archivo quitado.", false);
  }

  const listoAdjuntar =
    !!archivo && (espacio.elemento !== "imagen" || (leyenda.trim().length >= 3 && (!pedirOrigen || validarOrigenImagen(origen.origen, origen.fuente).length === 0)));

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">
          {espacio.titulo} {espacio.obligatorio ? <span className="text-red-500">*</span> : <span className="text-xs font-medium text-muted">(opcional)</span>}
        </h2>
        {espacio.descripcion && <p className="text-sm text-muted mt-1">{espacio.descripcion}</p>}
        {espacio.ayuda && <p className="text-xs text-muted mt-1">{espacio.ayuda}</p>}
        <ul className="mt-2 text-xs text-gray-600 list-disc pl-5">{reglasRecurso(espacio).map((r) => <li key={r}>{r}</li>)}</ul>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">{error}</div>}
      {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">{success}</div>}

      <div className="space-y-4">
        {espacio.elemento === "lista" && (
          <div className="space-y-2">
            {lista.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted w-6 text-right">{i + 1}.</span>
                <input aria-label={`Elemento ${i + 1}`} value={t} disabled={disabled} onChange={(e) => setLista(lista.map((x, k) => (k === i ? e.target.value : x)))} className={campo} />
                {!disabled && <button type="button" onClick={() => setLista(lista.filter((_, k) => k !== i))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
              </div>
            ))}
            {!disabled && lista.length < max && (
              <button type="button" onClick={() => setLista([...lista, ""])} className="text-sm font-bold text-brand-red hover:underline">+ Agregar elemento</button>
            )}
          </div>
        )}

        {espacio.elemento === "enlace" && (
          <div className="space-y-3">
            {enlaces.map((x, i) => (
              <div key={i} className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                <input aria-label={`Dirección del enlace ${i + 1}`} type="url" placeholder="https://" value={x.url} disabled={disabled}
                  onChange={(e) => setEnlaces(enlaces.map((y, k) => (k === i ? { ...y, url: e.target.value } : y)))} className={campo} />
                <input aria-label={`Descripción del enlace ${i + 1}`} placeholder="Qué es (video, repositorio, sitio…)" value={x.descripcion} disabled={disabled}
                  onChange={(e) => setEnlaces(enlaces.map((y, k) => (k === i ? { ...y, descripcion: e.target.value } : y)))} className={campo} />
                {!disabled && <button type="button" onClick={() => setEnlaces(enlaces.filter((_, k) => k !== i))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
              </div>
            ))}
            {!disabled && enlaces.length < max && (
              <button type="button" onClick={() => setEnlaces([...enlaces, { url: "", descripcion: "" }])} className="text-sm font-bold text-brand-red hover:underline">+ Agregar enlace</button>
            )}
          </div>
        )}

        {(espacio.elemento === "imagen" || espacio.elemento === "archivo") && (
          <>
            {items.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay archivos adjuntos.</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {items.map((x, i) => {
                  const img = x as ImagenEspacio;
                  const arc = x as ArchivoEspacio;
                  const nota = espacio.elemento === "imagen" ? notaImagen(img.origen, img.fuente) : [];
                  return (
                    <li key={i} className="border border-border rounded-lg p-3 space-y-2 bg-slate-50">
                      {espacio.elemento === "imagen" ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.leyenda} className="w-full max-h-44 object-contain rounded border border-border bg-white" />
                          <p className="text-sm font-semibold">{img.leyenda}</p>
                          {nota.length > 0 && <p className="text-xs text-muted">{nota.map((s, k) => (s.cursiva ? <em key={k}>{s.texto}</em> : <span key={k}>{s.texto}</span>))}</p>}
                        </>
                      ) : (
                        <button type="button" onClick={() => openDocument(arc.url, arc.nombre)} className="text-sm font-bold text-brand-red hover:underline break-all text-left">
                          {arc.nombre}
                        </button>
                      )}
                      {!disabled && <button type="button" disabled={pending} onClick={() => quitar(i)} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
                    </li>
                  );
                })}
              </ul>
            )}
            {!disabled && items.length < max && (
              <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                <input key={inputKey} type="file" accept={accept} aria-label={espacio.elemento === "imagen" ? "Imagen" : "Archivo"}
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="block text-sm" />
                {espacio.elemento === "imagen" && (
                  <>
                    <div>
                      <label htmlFor={`pie-${espacio.id}`} className="block text-xs font-bold text-muted uppercase mb-1">Pie de imagen</label>
                      <input id={`pie-${espacio.id}`} value={leyenda} maxLength={MAX_CARACTERES_LEYENDA} onChange={(e) => setLeyenda(e.target.value)} className={campo} />
                    </div>
                    {pedirOrigen && <OrigenImagenCampos idBase={`esp-${espacio.id}`} valor={origen} onChange={setOrigen} />}
                  </>
                )}
                <button type="button" disabled={!listoAdjuntar || pending} onClick={adjuntar}
                  className="px-4 py-2 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm disabled:opacity-50">
                  {pending ? "Adjuntando..." : "Adjuntar"}
                </button>
              </div>
            )}
          </>
        )}

        {problemas.length > 0 && !disabled && <p className="text-xs text-amber-800 font-semibold">Para continuar: {problemas.join(" ")}</p>}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
          {pasoAnterior !== null ? (
            <button type="button" onClick={() => router.push(`?id=${propuestaId}&step=${pasoAnterior}`)}
              className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors cursor-pointer">
              ← Volver al paso anterior
            </button>
          ) : <span />}
          {!disabled && (
            <div className="flex items-center gap-3">
              {editable && (
                <button type="button" disabled={pending} onClick={() => guardar(false)}
                  className="px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer">
                  Guardar Borrador
                </button>
              )}
              <button type="button" disabled={pending} onClick={() => guardar(true)}
                className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
                {pending ? "Guardando..." : editable ? "Guardar y Continuar" : "Continuar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
