import CsvUploader from "@/components/CsvUploader";

export default function CsvImportPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-brand-red">Carga Masiva de Datos</h1>
        <p className="text-sm text-muted">
          Importa registros masivamente verificando la información antes de guardarla.
        </p>
      </div>
      
      <CsvUploader />
    </div>
  );
}
