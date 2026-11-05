# Ficha de proyecto: entrega P2, la propuesta usa la ficha (5-nov-2026)

Ruta completa en [FICHA_PROYECTO.md](FICHA_PROYECTO.md) §6. Las entregas anteriores están en [ENTREGA_P0_P1.md](ENTREGA_P0_P1.md).

## Qué hace

- **Asignación de la ficha.** Al crear una propuesta de **proyecto**, se le asigna la versión habilitada de la ficha que mejor corresponde al egresado. Gana la más específica:
  1. la ficha de su carrera;
  2. la de su facultad;
  3. la general.

  Dentro de una ficha se usa la versión habilitada de número más alto, porque qué versión usa cada cohorte se decide en la entrega 3. La versión queda guardada en la nueva columna `propuestas.ficha_version_id`.
- **El asistente sigue la ficha:**
  - **Orden y contenido:** los pasos aparecen en el orden de la ficha, con su título, descripción y ayuda.
  - **Espacios de la fase 1:** portada, actores, carta, problema, justificación, alcance, objetivos y documentos usan los formularios de siempre. Cada formulario recibe `pasoSiguiente` y `pasoAnterior`; antes los números de paso estaban fijos.
  - **Espacios nuevos de texto:** los que no existían en la fase 1, como "Antecedentes", usan un formulario nuevo (`TextoEspacioForm`) que aplica las reglas de la ficha (obligatorio, palabras mínimas y máximas) en el servidor. La respuesta se guarda en la nueva tabla `respuestas_espacios`.
  - **Otros elementos sin formulario para proyecto:** se muestran como "paso todavía sin formulario".
  - **Desbloqueo:** cada paso se desbloquea al completar el anterior, con las mismas condiciones de la fase 1.
- **Las propuestas anteriores no cambian.** Sin ficha, el asistente usa la ficha base, que reproduce los mismos 8 pasos. La huella de ratificación solo agrega las respuestas nuevas cuando existen, así que las firmas que ya había siguen valiendo.
- **Reglas que ya salen de la ficha** (si la propuesta tiene ficha; si no, los valores de la fase 1):

  | Regla | Valor de la fase 1 |
  |---|---|
  | Máximo de integrantes, al invitar y al aceptar | 3 |
  | Mínimo y máximo de objetivos específicos, en el formulario y en el servidor | 4 a 6 |
  | "Misma carrera", si la ficha la activa | No se exige |

  "Misma cohorte" se exige siempre (P0).

## Base de datos

`scripts/fichas/ligar_propuestas_fichas.ts`. Solo agrega, y se puede ejecutar más de una vez.
- Agrega la columna `propuestas.ficha_version_id`, que apunta a `fichas_versiones`. Queda en null para las propuestas anteriores.
- Crea la tabla `respuestas_espacios`, con `propuesta_id`, `espacio_id` (el id estable del espacio en la ficha) y `contenido`. Hay una sola fila por propuesta y espacio.

Se ejecutó dos veces sobre `dev-fichas`.

## Datos de prueba

El script `scripts/fichas/sembrar_equipo_proyecto.ts` siembra los datos, solo en desarrollo. Con `--borrar` elimina todo lo que creó.
- **Cohorte `PRUEBA-PRO-2026`:** copia las fechas de C2-2026 y tiene la recepción abierta hasta el 15 de diciembre de 2026. Con ella hay tres cohortes activas, lo que también prueba la elección de cohorte de P0.
- **Tres egresados de Ingeniería en Sistemas** de esa cohorte, cada uno con sus 3 documentos. Los correos están en el encabezado del script; la contraseña es la de demostración.
- **PRO-ING-001-SIST versión 2** se habilitó desde el constructor.

## Comprobado en el navegador

Sobre `dev-fichas`, con el servidor de desarrollo:

1. El líder creó una propuesta de proyecto, que es la **propuesta 70**. Quedó ligada a PRO-ING-001-SIST versión 2 y el asistente mostró sus **9 pasos en el orden de la ficha**: "Antecedentes" en el 3 y la carta en el 8.
2. **Misma cohorte:** al invitar a un egresado de C3-2026, el sistema lo rechazó con el mensaje MISMA_COHORTE.
3. Invitó a los dos integrantes de prueba, y ambos aceptaron desde su sesión. El equipo quedó de 3.
4. **Formulario nuevo de texto ("Antecedentes"):**
   - mostró la ayuda de la ficha y el límite de 150 a 400 palabras;
   - con 4 palabras, el servidor lo rechazó;
   - con 170 palabras, guardó y pasó al paso 4.
5. Los actores, el problema, la justificación y el alcance avanzaron en el orden de la ficha.
6. **Objetivos:** el formulario indicó "de 3 a 6", el mínimo de la ficha. Con 3 objetivos guardó, algo que en la fase 1 se rechazaba por ser menos de 4. Luego pasó al paso 8, la carta.
7. **Vista de un integrante:** ve los pasos de la ficha en solo lectura, con el texto del líder y sin botones de guardar.
8. **Propuesta anterior sin ficha** (la 68): sigue con los 8 pasos de la fase 1.
9. No hubo errores de consola, salvo un 404 que provoqué a propósito al abrir una ficha inexistente.

Además: `tsc` sin errores, `verificar_fichas.ts` 47 de 47, y ESLint sin errores nuevos.

## Envío del equipo (probado el 5-nov, después del commit de P2)

El usuario subió la carta de la propuesta 70 a mano. Así quedaron probadas H1 y E5:

| Intento | Resultado |
|---|---|
| Enviar sin ninguna ratificación | Bloqueado: RATIFICACION_INCOMPLETA. |
| Enviar con la firma del líder solamente | Bloqueado: RATIFICACION_INCOMPLETA. |
| Enviar con la firma de los 3 integrantes, cada uno desde su sesión | La propuesta pasó a "enviada". |

Las tres firmas tienen la misma huella, y esa huella ya incluye la respuesta de "Antecedentes".

**Observaciones de la fase 1, no causadas por P2:**
- **Historial (corregido):** `enviarPropuesta` no escribía en `historial_estados`, así que el envío no quedaba en el historial de la propuesta. Ahora registra el cambio de estado → "enviada". Solo se comprobó por código: la propuesta 70 se envió antes de la corrección, así que su envío no está en el historial.
- **Panel del líder:** después de enviar, dice que la propuesta "ha sido asignada a la Coordinación de Facultad", aunque todavía está en "enviada".

## No probado todavía

- **El límite de integrantes desde la ficha:** no hay un cuarto egresado de la misma cohorte. La regla de cohorte se revisa antes que la de cupo.
- Las notificaciones al equipo y el inicio del plan con documentos faltantes (P0).

## Limitaciones conocidas

- **Revisores:** el PDF de la propuesta y las vistas de admin, coordinador y asesor todavía no muestran las respuestas de los espacios nuevos. Se resuelve junto con la plantilla de documentos.
- **Textos fijos de los formularios de la fase 1:** algunos siguen con su texto de navegación fijo (por ejemplo, "← Volver a Justificación"), aunque el orden cambie.
- **Carta:** sigue usando +21 y +150 días fijos. La ficha de ejemplo coincide con esos valores, pero todavía no se leen de ella.
- **Investigación y pasantía:** todavía no leen la ficha. Solo se asigna ficha a proyecto (`MODALIDADES_CON_FICHA`).
- **Observación de la fase 1, no causada por P2:** en el panel del integrante, la propuesta en redacción aparece con el texto "Su propuesta ha sido enviada a revisión".

## Siguiente: P3

El plan de trabajo del equipo: editor jerárquico, responsables, montos, plan general e individual, y aprobación del asesor. Las tablas y la lógica de sumas reutilizan `lib/fichas/planTrabajo.ts`.
