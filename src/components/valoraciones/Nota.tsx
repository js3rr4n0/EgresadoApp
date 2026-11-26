// Nota de 1 a 10 con el color según su nivel (entrega V3): alta en verde, media en ámbar, baja en el rojo institucional.

import { formatoNota, tonoNota } from "@/lib/valoraciones";

const CLASES = {
  alta: "bg-green-100 text-green-800",
  media: "bg-amber-100 text-amber-800",
  baja: "bg-red-100 text-brand-red",
  ninguna: "",
} as const;

export default function Nota({ valor, vacio = "sin valoraciones", grande = false }: { valor: number | null; vacio?: string; grande?: boolean }) {
  const tono = tonoNota(valor);
  if (tono === "ninguna") return <span className="text-muted">{vacio}</span>;
  return (
    <span className={`inline-block rounded-md font-bold tabular-nums ${CLASES[tono]} ${grande ? "px-2.5 py-0.5 text-xl" : "px-1.5 py-px"}`}>
      {formatoNota(valor)}
    </span>
  );
}
