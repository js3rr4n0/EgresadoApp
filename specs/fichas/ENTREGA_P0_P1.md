# Ficha de proyecto: entregas P0 y P1 (5-nov-2026)

Ruta completa en [FICHA_PROYECTO.md](FICHA_PROYECTO.md) §6. Los valores de proyecto salen del documento "Ejemplo para plantilla proyecto".

## P0: correcciones previas

| # | Qué se corrigió | Dónde |
|---|---|---|
| O2 | El cronograma leía "AAAA-MM-DD" con `new Date()`. En El Salvador eso caía un día antes, y los períodos y el año del encabezado se corrían. Ahora se lee como fecha local. | `components/ActividadesForm.tsx` |
| O4 | Con dos cohortes activas, la propuesta tomaba "la" activa al azar (ver la secuencia debajo de la tabla). | `lib/cohortes.ts`, `actions/propuestas.ts` |
| Equipo | **Misma cohorte obligatoria:** se valida al invitar y otra vez al aceptar. La cohorte del invitado debe ser la de la propuesta. | `lib/cohortes.ts` (`errorCohorteEquipo`), `actions/proyecto.ts` |
| H2 | El límite de 3 integrantes queda en una sola constante (`MAX_INTEGRANTES_EQUIPO`). En P2 saldrá de la ficha. | `actions/proyecto.ts` |
| H3 | Aprobación, ajustes del asesor, anulación e inicio del plan ahora se notifican al líder **y a los integrantes aceptados**. | `lib/notificarEquipo.ts`, `actions/adminPropuestas.ts`, `asesor.ts`, `coordinador.ts` |
| H4 | "Dar inicio al plan" verifica en el servidor que la propuesta esté aprobada y que estén todos los documentos de aprobación. | `actions/coordinador.ts` |

**Cómo se elige ahora la cohorte (O4):**
1. la cohorte activa del egresado;
2. si no está activa, la cohorte activa donde ya tiene su propuesta más reciente;
3. si tampoco, la primera activa, que es lo que la base devolvía en la práctica.

## P1: constructor de la ficha de proyecto completa

Se usa el mismo diseño y la misma lógica que la ficha de pasantía.

- **Nueva pestaña "Plan de trabajo",** para proyecto e investigación. Es una etapa nueva del formato (`EtapaPlan`), entre la propuesta y la ejecución, y se configura en cuatro tarjetas:

  | Tarjeta | Qué se configura |
  |---|---|
  | Estructura | Niveles (objetivo general → objetivo específico → macroactividad → actividad → subactividad). Las subactividades pueden no usarse, ser opcionales u obligatorias. También los mínimos por integrante, por objetivo y por macroactividad. |
  | Presupuesto | Si lleva presupuesto, si es un monto o recursos y gastos, la moneda, y si las columnas son por subperíodo o por período. |
  | Trabajo en equipo | Si el responsable va por objetivo específico o por actividad, el plan individual por integrante y el panel de carga para el asesor. |
  | Revisión y aprobación | Aprueba el asesor, sus días de revisión, y si el supervisor valida el plan (se documenta en el primer contacto). |

- **Cronograma de ejemplo** (con datos ficticios):
  - aplica las reglas de la ficha;
  - cada nivel suma los montos de sus hijos hasta el objetivo general;
  - se puede ver el plan General o el de cada integrante;
  - incluye el panel de carga por integrante que verá el asesor;
  - también aparece en la vista del egresado.
- **Ejecución** (campos opcionales del formato; las versiones anteriores se leen como pasantía):
  - el registro puede ser "por subperíodo" o "por actividad del plan";
  - el marco teórico puede ser obligatorio, opcional o no pedirse;
  - se puede pedir el avance (%) por actividad;
  - el informe puede ser "uno por trabajo" o "cada integrante + informe general";
  - en palabras, imágenes y páginas, **0 significa sin métrica**;
  - las partes del informe de período del proyecto se muestran como diseño ("Próximamente").
  - Al agregar una ejecución en una ficha de proyecto, ya trae 5 informes de 30 días, sin métrica, registro por actividad e informe individual y general.
- **Participantes:**
  - "Misma cohorte (siempre)" es fija;
  - "Misma carrera" es un interruptor, pendiente de confirmar.
- **Vista del egresado:** el plan de trabajo y la forma de trabajar en la ejecución, en frases, más el cronograma de ejemplo.
- **Validación nueva:**
  - solo puede haber un plan, y debe ir justo después de la propuesta;
  - necesita el espacio "Objetivos" y una etapa de ejecución;
  - no puede convivir con el cronograma de la propuesta;
  - no se permite en pasantía;
  - el registro por actividad exige un plan;
  - los mínimos deben estar dentro de su rango.
- **Comparación entre versiones:** muestra los cambios del plan y de los campos nuevos de la ejecución.
- **Lógica del plan** (`lib/fichas/planTrabajo.ts`, sin interfaz): sumas por nivel, plan individual y carga por integrante. La reutilizará P3.

**Por qué no se tocaron las fichas base:** PRO-BASE describe la fase 1 tal como funciona hoy, que termina en la aprobación. La plantilla de proyecto está en `lib/fichas/plantillas.ts` y se aplica al agregar el plan o la ejecución en una ficha nueva.

## Comprobado

- `tsc` sin errores.
- ESLint: sin errores en el módulo de fichas. En las acciones de fase 1 que se tocaron quedan los mismos errores que ya había, ninguno nuevo.
- `verificar_fichas.ts` 47 de 47. Incluye 18 comprobaciones nuevas: ficha de proyecto completa válida, errores típicos del plan, sumas por nivel, la suma de los planes individuales igual al general, y la carga por integrante.
- En el navegador, sobre `dev-fichas`, con PRO-ING-001-SIST:
  - se creó la **versión 2 en borrador** y se le agregó el plan;
  - la ejecución quedó con los valores de proyecto: 5 × 30 días, 4 subperíodos, registro por actividad con avance, marco opcional, sin métrica, e informe individual y general;
  - la carta quedó en 150 días;
  - se guardó, se recargó, y la pestaña Cambios lista los 13 cambios;
  - la ficha de pasantía no cambió: no tiene pestaña de plan y sigue válida;
  - no hubo errores de consola.
- Regla de cohorte contra `dev-fichas` (solo lectura):
  - un egresado de C2-2026 puede unirse a la propuesta 45 (C2-2026);
  - uno de C2-2025 recibe el error MISMA_COHORTE.
- **No probado en el navegador:**
  - invitar o aceptar con egresados reales;
  - las notificaciones al equipo;
  - el inicio del plan con documentos faltantes.

  Se probará con el equipo de prueba en P2.

**Datos de `dev-fichas` que conviene saber:** el dueño de la propuesta 45 tiene la cohorte C2-2025 (inactiva), pero su propuesta está en C2-2026. El paso 2 de la elección de cohorte cubre ese caso.

## Siguiente: P2

Ligar la propuesta a la versión de la ficha (`propuestas.ficha_version_id`). Que el asistente de 8 pasos y el límite de integrantes lean la ficha. Armar un equipo de prueba de 3 egresados de la misma cohorte.
