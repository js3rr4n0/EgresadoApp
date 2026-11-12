# Flujo de referencia: ficha de INVESTIGACIÓN de punta a punta (I6, 12-nov-2026)

Es el equivalente de [FLUJO_PROYECTO.md](FLUJO_PROYECTO.md) para investigación.

- **Ruta y contexto:** [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md).
- **Entregas:** [I1](ENTREGA_I1.md), [I2](ENTREGA_I2.md), [I3](ENTREGA_I3.md), [I4](ENTREGA_I4.md) e [I5](ENTREGA_I5.md).

## 1. El recorrido

| # | Etapa | Quién | Qué pasa | Dónde |
|---|---|---|---|---|
| 1 | **Ficha** | Admin | INV-ING-001-SIST: propuesta, **protocolo**, plan sin presupuesto, ejecución de 5 × 30 días e **informe final por capítulos**. | `/admin/bloques-propuestas/8` |
| 2 | **Propuesta** | Líder y equipo | Ver el detalle debajo de esta tabla. | `/egresado/redactar` |
| 3 | **Revisión** | Admin, coordinador y asesor | Igual que en proyecto. | |
| 4 | **Protocolo + plan** | Todo el equipo y el asesor | Ver el detalle debajo de esta tabla. | `/egresado/plan` (pestañas Protocolo y Plan), `/asesor/plan/[id]` |
| 5 | **Inicio** | Coordinador | Exige el plan aprobado y los documentos de aprobación. | |
| 6 | **Ejecución** | Cada integrante | Ver el detalle debajo de esta tabla. | `/egresado/ejecucion` |
| 7 | **Informes del período** | Cada integrante + general | Cronograma sin montos. "Resultados por actividad" con macroactividad, **documento solicitado** y anexo. | `/egresado/ejecucion/informe` |
| 8 | **Informe final** | Todo el equipo y el asesor | Ver el detalle debajo de esta tabla. | `/egresado/informe-final`, `/asesor/informe-final/[id]` |

**2. Propuesta.**
- El asistente sale de la ficha: 7 pasos, los actores sin ejecutor.
- El líder invita al equipo. Pueden ser de distintas carreras, pero de la misma cohorte.
- Todos ratifican y el líder envía.

**4. Protocolo + plan.**
- El líder redacta las 15 partes del protocolo. Algunas vienen precargadas de la propuesta, y la matriz de hipótesis es una tabla.
- El equipo arma el plan, y cada actividad declara su **documento solicitado**.
- Todos ratifican la versión final y el líder la envía.
- El asesor da **un solo dictamen escrito**, en 5 días hábiles.

**6. Ejecución.**
- Cada integrante registra sus actividades: el avance, el resultado, el **marco teórico con citas APA** y las evidencias.
- Al subir las evidencias se le recuerda el documento esperado.

**8. Informe final.**
- Capítulos versionados, con guardado automático y aviso de conflicto sin perder texto.
- El asesor revisa por capítulo.
- Todos ratifican, el líder entrega y la versión queda **congelada con su huella**.
- El asesor aprueba con un dictamen escrito.
- Se exporta a **PDF y Word** con el formato del documento final.

**Investigación individual.** Funciona igual, pero sin lo que solo aplica en equipo: no hay ratificaciones, columna de responsable, panel de carga ni pestaña Equipo. Se probó con la propuesta 72.

## 2. Cómo se comprueba

**Sin base de datos:** `npx tsx scripts/fichas/verificar_fichas.ts` hace **150 comprobaciones** del modelo:
- las secciones 13 a 15 cubren el protocolo, el documento solicitado y el informe final;
- las anteriores cubren pasantía y proyecto, que no cambian.

**Con `dev-fichas`, solo lectura:** `npx tsx --env-file=.env.local scripts/fichas/verificar_flujo.ts <propuestaId>` revisa cualquier modalidad con ficha. Se llamaba `verificar_flujo_proyecto.ts`. Revisa:
- la ficha, el equipo y la propuesta con sus firmas;
- **el protocolo:** completo, ratificado sobre la versión enviada y con el dictamen escrito;
- el plan, los registros y los informes del período;
- **el informe final:**
  - las versiones solo se agregan (numeración continua por capítulo) y cada una tiene un autor del equipo;
  - lo revisado es lo vigente;
  - la huella entregada coincide con el contenido;
  - todos ratificaron;
  - el dictamen quedó por escrito.

**Datos de prueba** (`scripts/fichas/sembrar_equipo_investigacion.ts`, solo `dev-fichas`; contraseña de demostración):

| Propuesta | Caso | Estado al 12-nov | Resultado del verificador |
|---|---|---|---|
| **71** | Equipo de 3 (inv.lider, inv.integrante1 e inv.integrante2, este de otra carrera) | En ejecución; informe final **aprobado** | Flujo coherente |
| **72** | Individual (inv.solo) | En ejecución; informe final **entregado** | Flujo coherente |
| 70 | Proyecto en equipo, la referencia anterior | En ejecución | Flujo coherente, con 1 aviso de datos antiguos |

**Atajos del script** (`--solo` aplica cada atajo a la propuesta individual):
- `--aprobar`;
- `--completar-protocolo`;
- `--completar-plan`;
- `--iniciar`;
- `--usar-version-vigente`;
- `--completar-informe-final`;
- `--individual`.

Sustituyen la revisión administrativa y la redacción de texto de relleno. Lo que se quiere probar (precarga, tabla, documento solicitado, ratificaciones, conflicto, historial, entrega y aprobación) se recorrió en pantalla.

## 3. Guion para la demostración

1. **Constructor:** abrir INV-ING-001 v2. Mostrar las pestañas Protocolo (15 partes, precarga y matriz) e Informe final (17 capítulos), y la Vista del egresado.
2. **Protocolo:** entrar como inv.lider a `/egresado/plan`.
   - El protocolo muestra los objetivos precargados y la matriz de hipótesis.
   - En el plan, cada actividad tiene su "Documento que se entregará".
   - Hay un botón para ratificar.
3. **Ejecución:** abrir la actividad 1.1.1.1. Mostrar "Documento que se espera", el marco teórico con su cita y el informe del período con el **Anexo 1**.
4. **Informe final:**
   - el marco teórico vino de las actividades;
   - el historial (versiones 1 a 4, con autores);
   - la huella de la versión entregada;
   - descargar el **Word** y abrir la vista para imprimir.
5. **Individual:** entrar como inv.solo. El mismo flujo, sin ratificaciones ni responsables.
6. **Verificador:** `verificar_flujo.ts 71`, que da "Flujo coherente".

## 4. Qué se generalizó (sirve para las siguientes modalidades)

- **Etapas con espacios:** propuesta, protocolo e informe final usan el mismo catálogo, el mismo editor del constructor (`EditorPropuesta` con `tipoEtapa`) y la misma precarga entre etapas.
- **Un solo asistente de propuesta** para proyecto e investigación, guiado por la ficha (`MODALIDADES_CON_FICHA`).
- **Ratificación por huella:** sirve para cualquier versión que firme el equipo (propuesta, protocolo + plan e informe final). La de la propuesta ahora vive en `lib/huellaPropuesta.ts`.
- **Textos por modalidad** (`textosModalidad`) en las pantallas compartidas de ejecución e informes.
- **Exportación** con los estilos del documento final (`lib/informeWord.ts`, ahora con sus ayudas exportadas).

## 5. Pendiente o para la reunión

- **Q5:** ¿quién redacta el protocolo? Hoy lo redacta el líder. El informe final, en cambio, lo redactan todos.
- **Q6:** ¿también se descuentan los feriados, además de los fines de semana?
- **Formato del documento final de investigación:** ¿tiene reglas propias, como agrupar la metodología en subapartados o un índice de tablas?
- **Columnas de la matriz de hipótesis** (provisionales).
- **Devolución por capítulo:** hoy, "devolver" el informe final marca todos los capítulos con observaciones.
- **Huella de la propuesta:** incluye todas las respuestas de `respuestas_espacios`, también las del protocolo. Solo importa antes de enviar la propuesta, pero conviene limitarla a los espacios de la propuesta.
