# Pasada de regresión 1 — línea base (29-oct-2026)

Primera pasada de [REGRESION_PASANTIA.md](../REGRESION_PASANTIA.md), antes de cambiar el código del módulo de fichas.

- **Base:** `dev-fichas` (endpoint `ep-shy-dream…`, `DB_ENTORNO=desarrollo`).
- **Rama:** `fase-2-fichas`, sin cambios de código respecto de `fase-2-jonathan`.
- **Responsable:** Claude, desde el navegador integrado con el servidor de desarrollo local.

Al terminar, la base principal sigue igual a la línea base: 18 usuarios · 4 cohortes · 14 propuestas (3 en ejecución) · 15 informes.

**Leyenda:**
- ✓ funciona como se espera;
- ✓\* funciona, con una observación (sección "Observaciones");
- ◐ probado solo en parte;
- — no se probó.

Ningún punto falló por algo nuevo: todo lo que no funciona ya venía de la fase 1.

## A. Propuesta de pasantía (egresado `PRUEBA-DEV-20261029`, propuesta 67)

| # | Resultado | Nota |
|---|---|---|
| A1 | ✓\* | Se crea en "Redactando" y abre el paso 1. Antes hubo que abrir la recepción, porque todas estaban cerradas (ver O4). |
| A2 | ✓ | 7 pasos en el orden esperado. |
| A3 | ✓ | Al hacer clic en un paso posterior, sigue en "Portada". |
| A4 | ✓ | Guarda el título y pasa al paso 2. |
| A5 | ✓ | Empresa existente (Soluciones Digitales): pasa al paso 3. |
| A6 | — | No se probó el registro de una empresa nueva. |
| A7 | — | Depende de A6. |
| A8 | ◐ | Con un supervisor existente avanza. No se probó el registro de un supervisor nuevo. |
| A9 | ✓ | Con emisión el 20-oct, el inicio mínimo es el 10-nov (+21). El 05-nov se rechaza. El fin se calcula solo: 09-abr-2027 (+150). |
| A10 | ✓\* | 5 períodos de 4 semanas. Los períodos empiezan un día antes que la fecha de la carta (ver O2). |
| A11 | ✓ | Sin actividades no guarda: "El Período 1 (Noviembre) debe contener un mínimo de 4 actividades…". |
| A12 | ✓ | Con la justificación vacía no avanza; con texto, sí. |
| A13 | ✓\* | Pide 3 documentos (pago_tg, certificacion_notas, servicio_social), pero con nombres distintos a los del panel (ver O3). |
| A14 | ✓ | Queda "enviada"; las propuestas 68 y 69 del mismo egresado quedan "Bloqueada (En Espera)". |
| A15 | ✓ | La impresión muestra el título, la empresa, el supervisor, la carta (fechas), las 20 actividades y la justificación. |

## B. Revisión y aprobación

| # | Resultado | Nota |
|---|---|---|
| B1 | ✓ | Propuesta 51: el admin la asigna a José Luis y aparece en su panel. |
| B2 | ✓ | José Luis asigna a Marco: "Solicitud de asesoría enviada". No hay un paso separado de "aceptar la asignación". |
| B3 | ✓ | Marco acepta y la propuesta aparece en "Mis propuestas". |
| B4 | ◐ | Lado del asesor ✓: la propuesta 42 vuelve a "Redactando" con observaciones. El lado del egresado no se pudo ver, porque Carlos no entra con `Test123!` (ver O8). |
| B5 | ✓ | Propuesta 51: "Aprobada por Asesor (Esperando Primer Contacto)". |
| B6 | ✓ | Propuesta 47: pide los 4 documentos. Con ellos subidos, muestra "COMPLETO (4/4)". |
| B7 | ✓ | La propuesta 47 pasa a `en_ejecucion`. |
| B8 | ◐ | No había ninguna pasantía aprobada esperando primer contacto. La regla de 7 días está en `src/app/actions/informes.ts:66`, y los informes existentes tienen fecha límite. |

## C. Ejecución (Kevin, propuesta 65; Julio, propuesta 40)

| # | Resultado | Nota |
|---|---|---|
| C1 | ✓ | 5 informes; entregas el 30-jun, 30-jul, 29-ago, 28-sep y 28-oct (día 30 de cada período). |
| C2 | ◐ | El formulario muestra los mínimos y lo que falta: "139 palabras · faltan 61"; "Mínimo 40, máximo 60". No se intentó enviar un subperíodo. |
| C3 | ✓ | Máximo 2 imágenes de soporte (principal y adicional), con su origen. |
| C4 | ◐ | No se envió un subperíodo nuevo. La bitácora registra "Declaró que el contenido es de su autoría" en envíos anteriores. |
| C5 | ✓ | Con el 5.2 en revisión, el 5.3 aparece como "SOLO BORRADOR". |
| C6 | ✓ | Revisión del 5.2: estados Vista/Modificada, comentarios por apartado, observaciones estándar y "Borrador guardado". |
| C7 | ✓ | La primera eliminación se envía. La segunda muestra "Eliminaciones solicitadas en el Período 5: 1 de 1" y no se envía. |
| C8 | ✓ | El informe final lista las actividades sin aprobar y deshabilita el envío. |
| C9 | ✓ | Muestra "La extensión estimada es de 14 páginas" como requisito pendiente. |
| C10 | ✓ | "Para aprobar el informe, cada pregunta debe tener al menos 40 palabras." |
| C11 | ✓ | Julio: "Faltan 31 días… días 90 a 100"; la visita es requisito para aprobar el informe 3. Kevin: visita completada, en solo lectura. |
| C12 | ✓\* | La vista de impresión del informe 4 se genera. El Word (637 KB) es un .docx válido: sus 20 partes XML se leen sin errores. No se abrió en Word. |
| C13 | ✓ | El egresado debe completar la introducción (4 párrafos), los agradecimientos (opcionales) y la carta. El asesor ve el aviso de verificar quién firma la carta. |
| C14 | ✓ | Las bitácoras del egresado y del asesor registran la solicitud de esta pasada. La del coordinador no se revisó. |

## D. Administración

| # | Resultado | Nota |
|---|---|---|
| D1 | ✓ | "Calcular fechas automáticamente": con recepción 01-feb / 01-mar-2027, los informes caen el día 22 de cada mes. No se guardó. |
| D2 | ✓ | "¡Próximamente!". |
| D3 | ◐ | Entran sin errores admin, coordinador, asesor y egresado. **No existe ningún usuario con rol decanato** en la base. |

## E. Proyecto e investigación (egresado `PRUEBA-DEV-20261029`)

| # | Resultado | Nota |
|---|---|---|
| E1 | ✓ | Propuesta 68: 8 pasos en el orden esperado. |
| E2 | ✓ | Propuesta 69: 7 pasos, sin "Alcance". |
| E3 | — | Falta un segundo egresado libre cuya contraseña sea conocida. |
| E4 | — | Requiere completar los pasos 1 a 6 del proyecto. |
| E5 | — | Depende de E3. |

## Observaciones

Ninguna la causó esta rama: todas existían antes. Conviene decidir cuáles se corrigen y en qué momento, en commits separados del módulo de fichas.

- **O1 (entorno, no es del código):** después de un rato de uso, el servidor de desarrollo empezó a responder 404 en todas las páginas con un id en la ruta, por ejemplo `/egresado/reportes/actividad/[id]` o `/asesor/seguimiento/[id]/…`. Pasó dos veces y se resolvió reiniciando `npm run dev`. Si aparece durante una pasada, reiniciar el servidor antes de anotar un ✗.
- **O2 (fecha desfasada un día):** `src/components/ActividadesForm.tsx:84` hace `new Date(fechaInicio)` sobre "2026-11-10". JavaScript lo interpreta como medianoche UTC, que en El Salvador es el 9-nov. Por eso el período 1 se muestra "09/11 al 08/12" y el 5 termina el 07/04, cuando la carta dice 10-nov → 09-abr. `src/lib/periodosPasantia.ts` ya trae `fechaLocalDesdeISO` para esto. Afecta a la entrega 4 o 5, porque es justo el cálculo de períodos que pasará a la ficha.
- **O3 (nombres de documentos):** los mismos 3 documentos se llaman distinto según la pantalla. En el panel del egresado: "Recibo de pago", "Certificación de notas" y "Constancia de servicio social". En el paso 7 (`src/components/DocumentosEstudianteForm.tsx:24-38`): "Hoja de inscripción", "Constancia de horas sociales" y "Carta de servicio social".
- **O4 (cohorte activa ambigua):** `initPropuesta` (`src/app/actions/propuestas.ts:153`) toma "el" período activo con `.limit(1)` y sin orden, pero hay dos activos (C2-2026 y C3-2026 Ejemplo). Según cuál devuelva la base, valida la recepción de uno u otro ciclo, y no el del egresado. Importa para la entrega 3, cohortes y versiones.
- **O5 (menor):** al enviar una solicitud de cambio al cronograma, la lista no se actualiza hasta recargar la página.
- **O6 (rendimiento):** en la vista de coordinador, `getNotificacionesUsuario()` se llamaba unas 2 veces por segundo mientras la página estaba abierta.
- **O7 (investigación):** en `/admin/propuestas/51` solo aparece la integrante Wendy, no el egresado dueño (Jonathan). El encabezado dice "CICLO I-2026".
- **O8 (credenciales de prueba):** Carlos Mejía no entra con `Test123!`. Para E3 hace falta un egresado sin propuesta activa y con una contraseña conocida.

## Datos de desarrollo que cambiaron con esta pasada

Solo en `dev-fichas`:

- **Kevin (propuesta 65):** se creó una solicitud de eliminación de la actividad 5.4.4 (id 36), que después se rechazó como asesor; quedan sus entradas en la bitácora.
- **Propuesta 42 (Carlos):** volvió a "Redactando", con observaciones de ajuste.
- **Propuesta 51 (Jonathan, investigación):** asignada a José Luis y a Marco; quedó "aprobada".
- **Propuesta 47 (Mariana):** 4 PDF de prueba subidos; quedó `en_ejecucion`.
- **`PRUEBA-DEV-20261029`:** propuesta 67 (pasantía, enviada), 68 (proyecto, borrador) y 69 (investigación, borrador).
- **Cohortes C2-2026 y C3-2026 Ejemplo:** se abrió la recepción para A1 y E y después se restauraron las fechas originales (30-ago y 01-oct).

Para la próxima pasada se puede partir de una rama de Neon nueva, creada desde `respaldo-2026-10-29`, o seguir sobre esta teniendo en cuenta estos cambios.
