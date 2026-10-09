"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  uploadImagenRegistroActividad,
  deleteImagenRegistroActividad,
  subirImagenAdicional,
  eliminarImagenAdicional,
} from "@/app/actions/registrosActividad";
import { openDocument } from "@/lib/pdfViewer";
import { AVISO_ORIGEN_IMAGEN, notaImagen } from "@/lib/fuenteImagen";
import { EJEMPLOS_REGISTRO, AVISO_EJEMPLOS } from "@/lib/ejemplosInforme";
import AyudaEjemplo from "@/components/AyudaEjemplo";
import RecortadorImagen from "./RecortadorImagen";
import SubirAnexo from "./SubirAnexo";
import OrigenImagenCampos, { type DatosOrigenImagen } from "./OrigenImagenCampos";

export interface ImagenAdicional {
  id: number;
  tipo: string;
  url: string;
  leyenda: string;
  origen: string;
  fuente: unknown;
}

type Carga = { tipo: "principal" | "soporte" | "anexo"; archivo: File };

const subtitulo = "text-[11px] font-extrabold uppercase tracking-wide text-slate-700";

function NotaImagen({ origen, fuente }: { origen: unknown; fuente: unknown }) {
  const nota = notaImagen(origen, fuente);
  if (nota.length === 0) return null;
  return (
    <p className="text-[11px] text-slate-500 font-medium">
      {nota.map((s, i) => (s.cursiva ? <em key={i}>{s.texto}</em> : <span key={i}>{s.texto}</span>))}
    </p>
  );
}

/**
 * Imágenes de la actividad: la imagen de soporte principal (obligatoria), imágenes de soporte adicionales (van en el
 * informe y cuentan para el límite semanal) y anexos (figuras adicionales para el informe final).
 */
export default function ImagenesActividad({
  actividadId,
  imagenUrl,
  numeroImagen,
  leyenda,
  onLeyenda,
  origenPrincipal,
  onOrigenPrincipal,
  imagenes,
  imagenesSemana,
  bloqueado,
  onError,
  comentario,
}: {
  actividadId: number;
  imagenUrl: string | null;
  numeroImagen: number | null;
  leyenda: string;
  onLeyenda: (v: string) => void;
  origenPrincipal: DatosOrigenImagen;
  onOrigenPrincipal: (v: DatosOrigenImagen) => void;
  imagenes: ImagenAdicional[];
  imagenesSemana: { usadas: number; limite: number; faltantesPrincipal: number };
  bloqueado: boolean;
  onError: (mensaje: string | null) => void;
  /** Comentario del asesor sobre las imágenes, si lo hay. */
  comentario?: React.ReactNode;
}) {
  const router = useRouter();
  const [carga, setCarga] = useState<Carga | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const adicionales = imagenes.filter((i) => i.tipo === "soporte");
  const anexos = imagenes.filter((i) => i.tipo === "anexo");
  const { usadas, limite, faltantesPrincipal } = imagenesSemana;
  const hayEspacioAdicional = usadas + faltantesPrincipal < limite;

  const elegirArchivo = (tipo: Carga["tipo"]) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (archivo) setCarga({ tipo, archivo });
    e.target.value = "";
  };

  const subir = async (imagen: Blob, pie: string, origen: DatosOrigenImagen) => {
    if (!carga) return;
    onError(null);
    setSubiendo(true);
    const fd = new FormData();
    fd.append(
      "archivo",
      imagen instanceof File ? imagen : new File([imagen], "soporte.png", { type: imagen.type || "image/png" })
    );
    fd.append("leyenda", pie);
    fd.append("origen", origen.origen ?? "");
    fd.append("fuente", JSON.stringify(origen.fuente));
    if (carga.tipo !== "principal") fd.append("tipo", carga.tipo);
    const res = carga.tipo === "principal" ? await uploadImagenRegistroActividad(actividadId, fd) : await subirImagenAdicional(actividadId, fd);
    setSubiendo(false);
    if (!res.success) {
      onError(res.error || "No se pudo subir la imagen.");
      return;
    }
    if (carga.tipo === "principal") {
      onLeyenda(pie);
      onOrigenPrincipal(origen);
    }
    setCarga(null);
    router.refresh();
  };

  const quitarPrincipal = async () => {
    if (!confirm("¿Eliminar la imagen de soporte principal?")) return;
    const res = await deleteImagenRegistroActividad(actividadId);
    if (res.success) {
      onLeyenda("");
      onOrigenPrincipal({ origen: null, fuente: null });
      router.refresh();
    } else onError(res.error || "No se pudo eliminar la imagen.");
  };

  const quitarAdicional = async (id: number) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const res = await eliminarImagenAdicional(id);
    if (res.success) router.refresh();
    else onError(res.error || "No se pudo eliminar la imagen.");
  };

  const botonArchivo = (tipo: Carga["tipo"], texto: string, deshabilitado = false) => (
    <label
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-[11px] font-bold transition-colors ${
        deshabilitado || subiendo ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
      }`}
    >
      {texto}
      <input
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={deshabilitado || subiendo}
        onChange={elegirArchivo(tipo)}
      />
    </label>
  );

  const miniatura = (img: ImagenAdicional) => (
    <li key={img.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={img.leyenda}
        className="w-16 h-16 object-cover rounded-md border border-slate-200 cursor-pointer shrink-0"
        onClick={() => openDocument(img.url)}
      />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-xs font-bold text-slate-800">{img.leyenda}</p>
        <NotaImagen origen={img.origen} fuente={img.fuente} />
      </div>
      {!bloqueado && (
        <button type="button" onClick={() => quitarAdicional(img.id)} className="text-[11px] font-bold text-red-600 hover:text-red-700 shrink-0">
          Eliminar
        </button>
      )}
    </li>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Imagen de soporte principal</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Obligatoria. Se recorta a 5 x 5 cm para el informe y requiere su pie de imagen.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border w-fit shrink-0 ${
            usadas >= limite ? "bg-amber-50 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-600 border-slate-200"
          }`}
          title="Imagen principal de cada actividad más las adicionales de la semana"
        >
          Imágenes de soporte de la semana: {usadas} de {limite}
        </span>
      </div>

      {comentario}
      <p className="px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-[11px] text-blue-900 font-semibold">{AVISO_ORIGEN_IMAGEN}</p>
      <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.imagen} aviso={AVISO_EJEMPLOS} />

      {imagenUrl ? (
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenUrl}
            alt={leyenda || "Imagen de soporte principal"}
            className="w-32 h-32 object-cover rounded-lg border border-slate-200 cursor-pointer shrink-0"
            onClick={() => openDocument(imagenUrl)}
          />
          <div className="flex-1 w-full space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Imagen N° {numeroImagen}</p>
            <div className="space-y-1">
              <label htmlFor="pie-principal" className="block text-[10px] font-bold uppercase text-slate-400">
                Pie de imagen
              </label>
              <input
                id="pie-principal"
                type="text"
                value={leyenda}
                maxLength={255}
                disabled={bloqueado}
                onChange={(e) => onLeyenda(e.target.value)}
                placeholder="Descripción breve de la imagen"
                className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-unicaes outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
              {leyenda.trim().length < 3 && (
                <p className="text-[11px] text-amber-700 font-semibold">El pie de imagen es obligatorio para poder enviar la semana.</p>
              )}
            </div>
            <OrigenImagenCampos idBase="principal" valor={origenPrincipal} onChange={onOrigenPrincipal} deshabilitado={bloqueado} />
            {!bloqueado && (
              <button type="button" onClick={quitarPrincipal} className="text-[11px] font-bold text-red-600 hover:text-red-700">
                Eliminar imagen
              </button>
            )}
          </div>
        </div>
      ) : bloqueado ? (
        <p className="text-[11px] text-slate-400 font-semibold">Sin imagen adjunta.</p>
      ) : (
        <div className="space-y-1.5">
          {botonArchivo("principal", "Seleccionar imagen principal")}
          <p className="text-[11px] text-amber-700 font-semibold">La imagen de soporte principal es obligatoria para poder enviar la semana.</p>
        </div>
      )}

      {/* Imágenes de soporte adicionales: van en el informe, junto a la principal */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <h3 className={subtitulo}>Imágenes de soporte adicionales (opcional)</h3>
        <p className="text-[11px] text-slate-500 font-semibold">
          Aparecen en el informe junto a la imagen principal. Cada semana admite hasta {limite} imágenes de soporte en total, contando la
          principal de cada actividad.
        </p>
        {adicionales.length > 0 && <ul className="space-y-2">{adicionales.map(miniatura)}</ul>}
        {!bloqueado &&
          (hayEspacioAdicional ? (
            botonArchivo("soporte", "Agregar imagen de soporte", !imagenUrl)
          ) : (
            <p className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-[11px] text-amber-900 font-semibold">
              Usted ya alcanzó el límite de imágenes de soporte por semana
              {faltantesPrincipal > 0 ? ` (se reservan ${faltantesPrincipal} para las imágenes principales pendientes)` : ""}. Si desea
              incluir otra imagen, agréguela como anexo.
            </p>
          ))}
        {!bloqueado && !imagenUrl && hayEspacioAdicional && (
          <p className="text-[11px] text-slate-400 font-semibold">Primero adjunte la imagen de soporte principal.</p>
        )}
      </div>

      {/* Anexos: figuras adicionales para el informe final */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <h3 className={subtitulo}>Anexos (opcional)</h3>
        <p className="text-[11px] text-slate-500 font-semibold">
          Imágenes o figuras adicionales de la actividad que formarán parte de los anexos del informe final. No cuentan para el límite
          semanal.
        </p>
        {anexos.length > 0 && <ul className="space-y-2">{anexos.map(miniatura)}</ul>}
        {!bloqueado && botonArchivo("anexo", "Agregar anexo")}
      </div>

      {carga && carga.tipo !== "anexo" && (
        <RecortadorImagen
          archivo={carga.archivo}
          enviando={subiendo}
          titulo={carga.tipo === "principal" ? "Imagen de soporte principal" : "Imagen de soporte adicional"}
          onCancelar={() => setCarga(null)}
          onConfirmar={subir}
        />
      )}
      {carga && carga.tipo === "anexo" && (
        <SubirAnexo archivo={carga.archivo} enviando={subiendo} onCancelar={() => setCarga(null)} onConfirmar={subir} />
      )}
    </div>
  );
}
