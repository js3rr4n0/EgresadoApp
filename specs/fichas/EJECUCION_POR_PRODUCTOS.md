# Ejecución por productos (notas del 13-nov-2026)

Notas del usuario sobre cómo se ejecutan los proyectos y las investigaciones. La idea central es que el asesor revisa, sobre todo, que se entreguen los **productos prometidos**:

- en cada actividad, la evidencia;
- en cada objetivo específico, sus productos y una conclusión.

Todo eso termina en el informe final. El mismo día se hizo la parte corta, con prioridad en la plantilla de investigación porque había demo. Lo demás queda para la semana siguiente.

## 1. Hecho el 13-nov-2026

| Nota | Cambio | Archivos |
| --- | --- | --- |
| Quitar el marco teórico del registro de actividad. | Las plantillas de proyecto e investigación usan `registro.marcoTeorico: "no"`.<br>El capítulo "Marco teórico" del informe final ahora se precarga del subapartado `desarrollo` de la fundamentación del protocolo (`precargarDe: "fundamentacion"`).<br>`PRECARGA_MARCO_REGISTROS` sigue disponible en el constructor para otras fichas. | `lib/fichas/plantillas.ts` |
| Fechas en que se hizo la actividad (del… al…). | Columnas `fecha_inicio` y `fecha_fin` en `registros_plan`, que crea `scripts/fichas/crear_registros_plan.ts`.<br>Son obligatorias para enviar; la final no puede ser anterior a la inicial ni posterior a hoy.<br>Se muestran en el informe del período ("Realizada del … al …") y en la tarjeta de la actividad. | `schema.ts`, `actions/ejecucionProyecto.ts`, `lib/fichas/planTrabajo.ts` (`problemasFechasRegistro`, `fechaValida`), `RegistroActividadProyecto.tsx`, `InformePeriodoProyecto.tsx`, `lib/fichas/informePeriodo.ts` |
| El avance va al final: no se pone hasta haber registrado lo que se hizo y las evidencias. | `faltaParaAvance` lista lo que falta: fechas, qué se hizo, resultado y evidencias.<br>En pantalla, el campo de avance está deshabilitado y explica qué falta.<br>El servidor descarta el avance si falta algo.<br>El registro sigue este orden: cuándo, qué se hizo, resultado, evidencias, avance. | `planTrabajo.ts`, `RegistroActividadProyecto.tsx`, `actions/ejecucionProyecto.ts` |
| La actividad no se envía sin evidencias, que deben ser el producto prometido. | Ya existía: mínimo 1 evidencia y "documento solicitado" en el plan.<br>Ahora el aviso dice: "Esto es lo que se espera: … Es el producto que se prometió en el plan de trabajo; envíelo aquí como evidencia". | `RegistroActividadProyecto.tsx` |
| Cambiar "Indique…" por "Describa qué se obtuvo…". | Hecho. La tarjeta "Acciones realizadas" pasó a llamarse "¿Qué se hizo?". | `RegistroActividadProyecto.tsx` |
| Ver "Mi avance" y el de los otros miembros en el cronograma. | El cronograma tiene un selector: Todo el equipo, Mi avance o cada integrante. Al elegir a alguien se calcula con `planIndividual`, es decir, el avance solo sobre su parte.<br>Las tarjetas por integrante muestran el avance de su parte, además de las actividades enviadas y aprobadas. | `EjecucionProyecto.tsx` |
| Ya no hacen falta informes individuales. | Las plantillas usan `informe.modo: "unico"`, un solo informe general.<br>El constructor conserva la opción "individual y general". | `plantillas.ts` |

### Pruebas y datos en dev-fichas

- **verificar_fichas:** 216 comprobaciones; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **INV-ING-001 v5** (id 15):
  - creada con `sembrar_equipo_investigacion.ts --version-ejecucion` a partir de la v4;
  - habilitada desde el constructor.
- **Propuesta 73** (inv.apartados@prueba.test) se ligó a la v5. En ella:
  - la actividad 1.1.1.1 del período 1 está enviada con fechas, una evidencia (enlace) y avance del 100 %;
  - la ejecución muestra 25 %.
- **Propuesta 71** (equipo inv.lider) sigue en la v2. Sirvió para probar el selector del cronograma: Mi avance 33 %, el equipo 11 %.

## 2. Para la semana siguiente

1. **Productos por objetivo específico.**
   - **En el plan:** cada objetivo específico declara sus productos esperados. Ejemplo: "Estudio de tiempos", "Documento de análisis de flujo", "Listado de levantamiento técnico".
   - **Habilitación:** cuando todas las actividades del objetivo llegan al 100 %, se habilita "Entregar productos del objetivo", con archivos y una **conclusión del objetivo**.
   - **Revisión:** el asesor revisa contra lo prometido.
   - **Calendario:** no hay fecha fija. Puede haber meses sin productos o con dos.
   - **Lo que queda en el informe final:** las conclusiones por objetivo.
2. **Resultados del informe final ordenados por objetivo.**
   - El capítulo de resultados se arma solo en este orden: objetivo general, objetivo específico 1 con sus productos, sus macroactividades con sus evidencias (siempre con el índice de la actividad), y así con los demás.
   - El capítulo de conclusiones parte de las conclusiones por objetivo.
3. **Bitácora o "reporte de modificaciones".**
   - Un texto opcional en cada actividad y objetivo para registrar cambios de recursos, tiempo o alcance, problemas o trabajo extra.
   - Pasa solo, en orden y con el índice de la actividad, como anexo de los informes del período y del final.
   - También sería un elemento del catálogo.
4. **Actividades no tan atadas a su período.** Hoy solo se registra en el período planificado, o después si quedó incompleta. Las notas piden que no sea tan estricto como en la pasantía. Falta decidir si se puede adelantar una actividad.
5. **Más adelante:** cuando un cambio es tan grande que se vuelve otro proyecto, solo lo autoriza el decanato.

### Preguntas abiertas

- ¿Los productos por objetivo se escriben en la propuesta o en el plan de trabajo? Hoy el plan va después de la propuesta aprobada.
- ¿La conclusión por objetivo la revisa el asesor junto con los productos, o solo se guarda para el informe final?
