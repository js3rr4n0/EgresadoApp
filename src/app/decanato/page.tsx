import { redirect } from "next/navigation";

// El rol «decanato» ahora es el administrador de facultad y usa el panel /admin con alcance a su facultad
// (specs/CONFIGURACION_COHORTE.md, C3). Este panel era solo un marcador.
export default function DecanatoPage() {
  redirect("/admin");
}
