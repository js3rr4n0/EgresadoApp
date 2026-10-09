// Piezas del documento compartidas por el informe de cada período y el informe final.
import { parrafosDe } from "@/lib/reglasRegistroActividad";
import { leerDatosCita, segmentosCitaApa, type SegmentoCita } from "@/lib/citaApa";

function Segmentos({ segmentos }: { segmentos: SegmentoCita[] }) {
  return (
    <>
      {segmentos.map((s, i) => (s.cursiva ? <em key={i}>{s.texto}</em> : <span key={i}>{s.texto}</span>))}
    </>
  );
}

/** Texto registrado: un párrafo por línea, justificado. */
export function ParrafosCuerpo({ texto }: { texto: string | null | undefined }) {
  return (
    <>
      {parrafosDe(texto).map((p, i) => (
        <p key={i} className="doc-parrafo">
          {p}
        </p>
      ))}
    </>
  );
}

/** Referencia APA 7: con los campos registrados conserva las cursivas; si es de texto libre se muestra tal cual. */
export function Referencia({ citaApa, citaApaDatos }: { citaApa: string; citaApaDatos: unknown }) {
  const datos = leerDatosCita(citaApaDatos);
  return (
    <p className="doc-parrafo">
      <strong>Referencia:</strong> {datos ? <Segmentos segmentos={segmentosCitaApa(datos)} /> : citaApa}
    </p>
  );
}

export interface ImagenDocumento {
  url: string;
  leyenda: string;
  numero: number;
  nota: SegmentoCita[];
}

/** Imágenes de 5 x 5 cm, dos por fila, con su pie y la nota de origen (APA 7). */
export function ImagenesDocumento({ imagenes, codigo }: { imagenes: (ImagenDocumento & { codigo?: string })[]; codigo?: string }) {
  return (
    <div className={imagenes.length > 1 ? "doc-imagenes" : undefined}>
      {imagenes.map((img) => (
        <figure key={img.numero} style={{ margin: "6pt 0", pageBreakInside: "avoid" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.leyenda} className="doc-imagen" />
          <figcaption className="doc-leyenda">
            Imagen {img.numero}. {img.leyenda} (actividad {img.codigo ?? codigo}).
            {img.nota.length > 0 && (
              <span className="doc-nota">
                <Segmentos segmentos={img.nota} />
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
