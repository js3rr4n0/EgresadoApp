# 🚀 Pendientes de EgresadoApp (Roadmap)

Con el panel base de administración y la estructura sólida ya establecida, estas son las funcionalidades que faltan para concluir los flujos core de la aplicación y lograr un sistema completamente funcional de principio a fin.

## 1. Módulo "Fechas y Periodos" (Panel Administrador)
- **Objetivo:** Definir y programar las ventanas de tiempo en las cuales los Egresados pueden subir y proponer sus Temas de Grado.
- **Tareas pendientes:**
  - Crear la UI (CRUD) en `/admin/periodos`.
  - Crear la tabla en la Base de Datos (si aún no existe) que almacene `fecha_inicio`, `fecha_fin`, `estado` y a qué `facultad/carrera` aplican.
  - Conectar este módulo con el flujo del Egresado: Si un alumno intenta enviar una propuesta pero no hay ningún "Periodo Activo", el sistema debe bloquear el envío y avisarle que el ciclo de recepción está cerrado.

## 2. Módulo "Catálogo de Empresas" (Panel Administrador)
- **Objetivo:** Tener una base de datos de instituciones, ONGs y empresas privadas donde los alumnos pueden hacer su Trabajo de Grado.
- **Tareas pendientes:**
  - Crear la UI (CRUD) en `/admin/empresas`.
  - Campos mínimos sugeridos: Nombre de Empresa, Sector, Persona de Contacto, Teléfono, Correo y Convenio (Activo/Inactivo).
  - Hacer que esta lista sea consultable (menú desplegable) por el Egresado a la hora de armar su propuesta.

## 3. Flujo del Egresado (Envío de Propuestas)
- **Objetivo:** Que el egresado pueda armar su equipo de tesis, escribir su abstract y enviar los anexos pertinentes a revisión.
- **Tareas pendientes:**
  - Completar el formulario multi-pasos para la creación de una propuesta (`/egresado`).
  - Lógica para enlazar (por carnet o correo) a los demás compañeros de tesis para que un solo alumno suba la propuesta pero impacte a su grupo.
  - Validaciones (verificar que no estén ya en otro grupo, que hayan subido todos los documentos requeridos de solvencia).

## 4. Flujo del Decanato y Asesor (Revisión y Aprobación)
- **Objetivo:** Permitir a las autoridades académicas leer las propuestas, hacer correcciones o aprobarlas.
- **Tareas pendientes:**
  - Panel o Bandeja de Entrada para el Decanato (y/o Asesores) listando todas las Propuestas Nuevas que entran.
  - Un sistema simple de estados por propuesta: `EN REVISIÓN`, `OBSERVADA`, `APROBADA`, `RECHAZADA`.
  - **Foro y Comentarios:** Habilitar un chat o feed por cada propuesta donde el Asesor pueda dejar anotaciones y el Egresado pueda subsanarlas y subir nuevos documentos (versiones).

## 5. Auditoría y Logs (Opcional pero recomendado)
- **Objetivo:** Seguridad administrativa.
- **Tareas pendientes:**
  - Guardar el registro de "Quién" borró "Qué". Por ejemplo, un log que diga: *"El Admin Carlos borró la facultad de Arquitectura el 10 de octubre"*.
