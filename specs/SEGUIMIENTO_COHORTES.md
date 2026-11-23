# Seguimiento de cohortes en ejecución e informes del administrador

Notas del usuario del 23-nov-2026. Este documento revisa qué se puede hacer con los datos que ya tiene el sistema, qué
se muestra como ejemplo porque el dato todavía no existe, y en qué orden se construye.

## 1. Idea general

Un trabajo de graduación (todo el período técnico) dura más que un ciclo académico, así que siempre hay dos cohortes
activas a la vez: la que está **comenzando** (recepción de propuestas y pre-ejecución) y la que está **finalizando**
(ejecución, último mes y cierre). El administrador ve cada cohorte activa y descarga sus informes.

- **Pantalla:** «Seguimiento de cohortes» en el menú del administrador (`/admin/seguimiento`).
- **Fase de cada cohorte:** se calcula sola con las fechas de la cohorte (Fechas y Periodos):

| Fase | Hasta | Grupo |
|------|-------|-------|
| Recepción de propuestas | `fin_recepcion` | Comenzando |
| Pre-ejecución | `max_inicio_proceso` | Comenzando |
| Ejecución | 30 días antes de `max_informe_final` | Finalizando |
| Último mes | `max_informe_final` | Finalizando |
| Cierre administrativo | `max_aprobacion_final` | Finalizando |
| Finalizada | después | — |

- **Filtros de todos los informes:** alcance (general, facultad o carrera) y periodicidad (automática según el informe o
  fechas elegidas a mano).
- **Descargas:** cada informe se descarga en CSV (lo abre Excel, con tildes) y tiene vista para imprimir o guardar en PDF.
  No se agrega ninguna librería nueva.

## 2. Qué hay y qué no

| Dato | ¿Existe? | De dónde sale |
|------|----------|---------------|
| Egresados potenciales de la cohorte | Sí | `usuarios.cohorte` = nombre del ciclo, rol egresado |
| Propuestas recibidas, por modalidad y carrera | Sí | `propuestas.enviada_en`, `tipo`; carrera del egresado |
| Empresas por carrera | Sí | `propuestas.empresa_id` de la cohorte |
| Asesores por carrera | Sí | `usuarios.carreras_asignadas` y `carrera_id` de los asesores |
| Fecha de aprobación (inicio de los 21 días) | Sí | `propuestas.fecha_aprobacion` |
| Plan de trabajo | Sí | Proyecto e investigación: `planes_trabajo` aprobado. Pasantía: documento «Plan de trabajo firmado» |
| Dictamen de propuesta y de plan | Sí | `documentos_propuesta` (`dictamen_propuesta`, `dictamen_plan_trabajo`) |
| Informe de primer contacto | Sí | `informes_primer_contacto` enviado. Necesita supervisor: sin supervisor se marca «No aplica» |
| Inicio oficial de la ejecución | Sí | Historial de estados (`en_ejecucion`) |
| Avisos de retraso enviados (cuántos y cuándo) | **No** | El sistema todavía no envía avisos automáticos de retraso: **ejemplo** |
| Calificación de asesores | **No** | No hay evaluación de asesores: **ejemplo** |
| Presentaciones públicas pendientes | **Parcial** | Solo el capítulo del informe final; no hay agenda de presentaciones: **ejemplo** |
| Empresas dadas de baja o que siguen | Sí | `empresas.habilitada` |

## 3. Informes

### Cohorte que está comenzando
- **Informe 1. Recepción** (automático: desde el inicio de la recepción hasta hoy):
  - cuántos egresados entregaron propuesta de cuántos potenciales, por modalidad y carrera;
  - cuántos faltan por entregar, por modalidad y carrera;
  - empresas por carrera;
  - asesores por carrera.
- **Informe 2. Pre-ejecución (21 días)** (automático: el estado de hoy):
  - visor de todas las propuestas aprobadas que todavía no inician la ejecución, de cualquier modalidad;
  - egresado y asesor, días transcurridos y días que faltan para los 21;
  - requisitos entregados y pendientes;
  - avisos de retraso (ejemplo);
  - fecha de fin estimada (límite del informe final más los días de retraso) y si pasa del cierre administrativo
    (riesgo de baja);
  - cuántos cumplieron al día 7, al 14 y cuántos pasaron de los 21.

### Cohorte que está finalizando (entrega K2, hecha)
- Trabajos retrasados y cuánto, por asesor y carrera.
- Asesores que terminaron o están terminando (disponibles para la nueva cohorte).
- Seguimiento cada 30 días y, en el último mes, diario: al día, retrasados, en qué y con qué asesor.
- Procesos terminados y pendientes: avisos durante el proceso, modalidad, informe final entregado y presentación
  pública pendiente (ejemplo).

### Cierre administrativo (entrega K3, hecha)
- Resumen general, por facultad y por carrera: egresados que finalizaron, empresas que participaron, egresados por
  asesor, asesor por empresa, empresas dadas de baja y que siguen, asesores con calificación alta y baja (ejemplo).

## 4. Entregas

- **K1** (hecha): pantalla de cohortes activas, filtros, informes de la cohorte que comienza (recepción y pre-ejecución),
  CSV y vista para imprimir.
- **K2** (hecha): informes de la cohorte que finaliza, en tres pestañas:
  - **Seguimiento y trabajos retrasados:** estado de cada trabajo en ejecución a la fecha de corte (al día, retrasado o
    terminado), en qué va atrasado y cuántos días, entregas tarde y observadas, y resúmenes por asesor y por carrera.
    Corte automático cada 30 días desde `max_inicio_proceso`; en el último mes, diario. Con fechas elegidas, el corte es
    la fecha «hasta».
  - **Asesores disponibles:** disponible (terminó todo), terminando (solo le falta el informe final) u ocupado, con sus
    trabajos en otras cohortes activas.
  - **Procesos terminados y pendientes:** informe final aprobado, en revisión o pendiente; presentación pública y avisos
    de alerta como ejemplo.
  - Entregas que se revisan: pasantía, los cinco informes mensuales (con su fecha límite); proyecto e investigación, un
    informe por período de la ejecución de la ficha y el informe final si la ficha lo pide.
- **K3** (hecha): resumen del cierre administrativo, a hoy o a la fecha «hasta», con el alcance elegido: egresados que
  finalizaron (informe final aprobado, contando líder e integrantes), trabajos, empresas que participaron (las que siguen y
  las dadas de baja, según `empresas.habilitada`), egresados por asesor, asesor por empresa y por carrera. La calificación
  de asesores es un ejemplo.

## 5. Decisiones (23-nov-2026)

- **P1. Pendiente (regla confirmada).** No se debe poder iniciar la ejecución hasta cumplir los tres requisitos (plan de
  trabajo, dictámenes y primer contacto) **y** los 21 días. Hoy el sistema ya exige el plan aprobado y los documentos,
  pero deja iniciar antes de los 21 días y sin el primer contacto. Se deja para después porque afecta las pruebas DEMO.
- **P2. Pendiente.** Primer contacto en proyecto e investigación sin supervisor: por ahora se marca «No aplica».
- **P3. Sí.** La fecha de fin es el límite del informe final de la cohorte (`max_informe_final`) más los días que pasaron
  de los 21. Si pasa del cierre administrativo (`max_aprobacion_final`, fin del período técnico) hay riesgo de baja.
