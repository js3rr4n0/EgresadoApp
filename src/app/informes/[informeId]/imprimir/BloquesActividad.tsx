// Piezas del documento compartidas por el informe de cada período y el informe final.
import { parrafosDe } from "@/lib/reglasRegistroActividad";
import { leerDatosCita, segmentosCitaApa, type SegmentoCita } from "@/lib/citaApa";
import { formatearFechaLarga } from "@/lib/periodosPasantia";
import type { InformeCompilado } from "@/lib/informeWord";

export function Segmentos({ segmentos }: { segmentos: SegmentoCita[] }) {
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

/**
 * Marco teórico con su referencia APA 7 inmediatamente después del punto final del texto (en el último párrafo). Con los
 * campos registrados conserva las cursivas; una referencia de texto libre se muestra tal cual.
 */
export function MarcoTeorico({ texto, citaApa, citaApaDatos }: { texto: string; citaApa: string | null; citaApaDatos: unknown }) {
  const parrafos = parrafosDe(texto);
  const datos = leerDatosCita(citaApaDatos);
  return (
    <>
      {parrafos.map((p, i) => (
        <p key={i} className="doc-parrafo">
          {p}
          {i === parrafos.length - 1 && citaApa && (
            <> {datos ? <Segmentos segmentos={segmentosCitaApa(datos)} /> : citaApa}</>
          )}
        </p>
      ))}
    </>
  );
}

export interface ImagenDocumento {
  url: string;
  leyenda: string;
  numero: number;
  /** Identificador en el documento: 1.1.1.A / 1.1.1.B en las actividades, «de anexo N» en el contenido adicional. */
  etiqueta: string;
  nota: SegmentoCita[];
  /** Código de la actividad; solo se indica fuera de la actividad (contenido adicional del informe final). */
  codigo?: string;
}

/** Imágenes de 5 x 5 cm, dos por fila, con su pie (máximo dos líneas) y la nota de origen (APA 7). */
export function ImagenesDocumento({ imagenes }: { imagenes: ImagenDocumento[] }) {
  return (
    <div className={imagenes.length > 1 ? "doc-imagenes" : undefined}>
      {imagenes.map((img) => (
        <figure key={img.numero} id={`imagen-${img.etiqueta.replace(/\./g, "-")}`} style={{ margin: "6pt 0", pageBreakInside: "avoid" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.leyenda} className="doc-imagen" />
          <figcaption className="doc-leyenda">
            <span className="doc-pie">
              Imagen {img.etiqueta}. {img.leyenda}
              {img.codigo ? ` (actividad ${img.codigo})` : ""}.
            </span>
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

type CambiosCronograma = NonNullable<InformeCompilado["cambiosPeriodo"]>;

/** Cronograma real de un período: cada actividad con su estado final y los cambios aprobados que tuvo. */
export function TablaCronogramaReal({ periodo }: { periodo: CambiosCronograma["cronograma"][number] }) {
  return (
    <table className="doc-tabla" style={{ fontSize: "10pt", marginBottom: "10pt" }}>
      <thead>
        <tr style={{ background: "#d9d9d9" }}>
          <th style={{ width: "10%" }}>Código</th>
          <th style={{ textAlign: "left" }}>Actividades del período {periodo.numero}</th>
          {Array.from({ length: periodo.semanas }, (_, i) => (
            <th key={i} style={{ width: "6%" }}>
              SP{i + 1}
            </th>
          ))}
          <th style={{ width: "22%" }}>Estado</th>
        </tr>
      </thead>
      <tbody>
        {periodo.filas.map((fila) => (
          <tr key={fila.id} style={fila.eliminada ? { color: "#595959", fontStyle: "italic" } : undefined}>
            <td style={{ textAlign: "center" }}>{fila.codigo}</td>
            <td style={fila.eliminada ? { textDecoration: "line-through" } : undefined}>{fila.titulo}</td>
            {Array.from({ length: periodo.semanas }, (_, i) => (
              <td key={i} style={i + 1 === fila.semana ? { background: fila.eliminada ? "#bfbfbf" : "#7f7f7f" } : undefined} />
            ))}
            <td>{fila.estado}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Cronograma final ejecutado: solo las actividades que se ejecutaron, en su ubicación definitiva (sin las eliminadas). */
export function TablaCronogramaEjecutado({ periodo }: { periodo: CambiosCronograma["cronograma"][number] }) {
  const filas = periodo.filas.filter((f) => !f.eliminada);
  return (
    <table className="doc-tabla" style={{ fontSize: "10pt", marginBottom: "10pt" }}>
      <thead>
        <tr style={{ background: "#d9d9d9" }}>
          <th style={{ width: "10%" }}>Código</th>
          <th style={{ textAlign: "left" }}>Actividades ejecutadas en el período {periodo.numero}</th>
          {Array.from({ length: periodo.semanas }, (_, i) => (
            <th key={i} style={{ width: "6%" }}>
              SP{i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.id}>
            <td style={{ textAlign: "center" }}>{fila.codigo}</td>
            <td>{fila.titulo}</td>
            {Array.from({ length: periodo.semanas }, (_, i) => (
              <td key={i} style={i + 1 === fila.semana ? { background: "#7f7f7f" } : undefined} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Modificaciones autorizadas al cronograma original, con su justificación y su validación. */
export function TablaModificaciones({ modificaciones }: { modificaciones: CambiosCronograma["modificaciones"] }) {
  return (
    <table className="doc-tabla" style={{ fontSize: "10pt" }}>
      <thead>
        <tr style={{ background: "#d9d9d9" }}>
          <th style={{ width: "12%" }}>Fecha</th>
          <th style={{ width: "14%" }}>Modificación</th>
          <th style={{ width: "22%" }}>Actividad</th>
          <th>Justificación</th>
          <th style={{ width: "24%" }}>Validación</th>
        </tr>
      </thead>
      <tbody>
        {modificaciones.map((m) => (
          <tr key={m.id}>
            <td>{m.fecha ? formatearFechaLarga(m.fecha) : "—"}</td>
            <td>{m.tipo}</td>
            <td>{m.actividad}</td>
            <td style={{ textAlign: "justify" }}>{m.justificacion}</td>
            <td>{m.validacion}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
