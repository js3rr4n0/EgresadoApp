"use client";

/**
 * Declaración de producción propia al enviar la semana (rúbrica): solo con "Sí" se habilita el envío, y queda registrada
 * en la bitácora del proceso.
 */
export default function DeclaracionAutoria({
  valor,
  onChange,
}: {
  valor: "si" | "no" | null;
  onChange: (v: "si" | "no") => void;
}) {
  return (
    <fieldset className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
      <legend className="sr-only">Declaración de autoría</legend>
      <p className="text-xs font-extrabold text-slate-800">
        ¿Declara usted que todo el contenido que está a punto de enviar es de su autoría?
      </p>
      <div className="flex gap-4">
        {(
          [
            ["si", "Sí, es de mi autoría"],
            ["no", "No"],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="declaracion-autoria"
              checked={valor === id}
              onChange={() => onChange(id)}
              className="accent-unicaes"
            />
            {label}
          </label>
        ))}
      </div>
      {valor === "no" && (
        <p className="text-[11px] text-red-700 font-semibold">
          No es posible enviar la semana si el contenido no es de su autoría. Revise y redacte con sus propias palabras lo que
          realizó; las imágenes ajenas deben indicar su fuente.
        </p>
      )}
      {valor === "si" && <p className="text-[11px] text-slate-500 font-semibold">La declaración quedará registrada en la bitácora.</p>}
    </fieldset>
  );
}
