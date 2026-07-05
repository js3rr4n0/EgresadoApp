"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearPeriodo } from "@/app/actions/periodos";

export default function PeriodoForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for dates
  const [inicioRecepcion, setInicioRecepcion] = useState("");
  const [finRecepcion, setFinRecepcion] = useState("");
  const [primerInforme, setPrimerInforme] = useState("");
  const [informeFinal, setInformeFinal] = useState("");

  const handleInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInicioRecepcion(val);

    if (val) {
      const date = new Date(val);
      // Auto-calculate finRecepcion as 14 days after inicio
      const finDate = new Date(date);
      finDate.setDate(finDate.getDate() + 14);
      setFinRecepcion(finDate.toISOString().split('T')[0]);

      // Auto-calculate primer informe (e.g. 1 month after fin)
      const primerDate = new Date(finDate);
      primerDate.setMonth(primerDate.getMonth() + 1);
      setPrimerInforme(primerDate.toISOString().split('T')[0]);

      // Auto-calculate informe final (e.g. 5 months after inicio for typical period)
      const finalDate = new Date(date);
      finalDate.setMonth(finalDate.getMonth() + 5);
      setInformeFinal(finalDate.toISOString().split('T')[0]);
    } else {
      setFinRecepcion("");
      setPrimerInforme("");
      setInformeFinal("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await crearPeriodo(formData);

    if (result.success) {
      // Reload page to show new period in table
      setInicioRecepcion("");
      setFinRecepcion("");
      setPrimerInforme("");
      setInformeFinal("");
      router.refresh();
      setPending(false);
    } else {
      setError(result.error || "Ocurrió un error al crear el periodo.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-6 shadow-sm mb-8">
      <h3 className="text-lg font-bold text-card-dark mb-4">Configurar Nuevo Periodo Académico</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-brand-red rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Inicio Recepción</label>
          <input 
            type="date" 
            name="inicioRecepcion" 
            value={inicioRecepcion}
            onChange={handleInicioChange}
            required
            className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Fin Recepción</label>
          <input 
            type="date" 
            name="finRecepcion" 
            value={finRecepcion}
            onChange={(e) => setFinRecepcion(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">1er Informe</label>
          <input 
            type="date" 
            name="fechaPrimerInforme" 
            value={primerInforme}
            onChange={(e) => setPrimerInforme(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Informe Final</label>
          <input 
            type="date" 
            name="fechaInformeFinal" 
            value={informeFinal}
            onChange={(e) => setInformeFinal(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button 
          type="submit" 
          disabled={pending}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-card-dark hover:bg-slate-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Confirmar y Activar Periodo"}
        </button>
      </div>
    </form>
  );
}
