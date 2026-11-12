# Entrega I3: protocolo y plan de trabajo de investigación (12-nov-2026)

Ruta: [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md). Entregas anteriores: [I1](ENTREGA_I1.md) y [I2](ENTREGA_I2.md).

## Respuestas aplicadas

- **Q7. El documento solicitado lo escribe el egresado en el plan,** en cada actividad. Al subir las evidencias de esa actividad durante la ejecución, se le recuerda "Documento que se espera: …".
- **Q5 (quién redacta) y Q6 (días hábiles) aún no tienen respuesta.** Se dejó lo propuesto, y las dos cosas se pueden cambiar en la ficha:
  - redacta el líder y los integrantes ratifican;
  - el plazo se cuenta en días hábiles.

## Cómo funciona

```
Propuesta aprobada ─► /egresado/plan:  [Protocolo] [Plan de trabajo (cronograma)]
                       Líder redacta el protocolo (algunas partes vienen precargadas de la propuesta)
                       Equipo arma el plan; cada actividad declara su "documento solicitado"
                       Cada integrante ratifica la versión final (protocolo + plan)
                       Líder envía ambos ─► Asesor: dictamen escrito, a más tardar en N días hábiles
```

**1. Pantalla "Protocolo"** (`ProtocoloYPlan.tsx` y `ProtocoloEquipo.tsx`):
- **Pestañas.** Se agregan a `/egresado/plan` y `/asesor/plan/[id]` solo cuando la ficha tiene protocolo. En proyecto, la pantalla del plan no cambia.
- **Partes.** Cada parte se marca con ✓, con ! si tiene pendientes, o con su número si está vacía.
- **Formularios.** Son los del asistente: `TextoEspacioForm` y `RecursoEspacioForm`, a los que se agregó `hrefPaso`.
  - El líder edita. Los integrantes y el asesor ven en solo lectura.
  - Se puede editar mientras el plan está en elaboración o con observaciones.
- **Precarga.** Si una parte todavía no tiene respuesta, empieza con lo que se escribió en la propuesta, con el aviso "se precargó…".
  - Ejemplos: la problemática viene del problema, y los objetivos vienen del general más los específicos con su descripción.
  - Hay que guardarla al menos una vez para que cuente como respuesta.
- **Tabla.** `RecursoEspacioForm` tiene el editor de filas de la matriz de hipótesis, con las columnas que define la ficha.

**2. Guardado.** `respuestasEspacios.ts` ahora acepta los espacios del protocolo:
- Solo el líder los guarda, después de aprobada la propuesta y mientras el plan no esté enviado ni aprobado.
- Las respuestas van a la misma tabla que las de la propuesta. Por eso la ficha valida que los ids no se repitan entre las dos etapas.
- Se guardan las tablas: las filas se recortan a las columnas de la ficha y se descartan las vacías.

**3. Ratificación** (tabla nueva `ratificaciones_plan`, script `crear_ratificaciones_plan.ts`):
- La firma de cada integrante es una huella de las respuestas del protocolo y del árbol del plan. Si alguien cambia algo, hay que volver a firmar.
- Solo se puede ratificar con el protocolo completo, los textos precargados ya guardados y el plan sin pendientes.

**4. Envío** (`enviarPlanTrabajo`). El envío se rechaza si:
- falta alguna parte del protocolo;
- hay textos precargados sin guardar;
- falta alguna firma vigente; el mensaje dice quién falta.

Al enviar se avisa al asesor y al equipo, con la fecha límite del dictamen.

**5. Dictamen del asesor** (`revisarPlanTrabajo`):
- Un solo dictamen para el protocolo y el plan: "Aprobar protocolo y plan" o "Pedir ajustes".
- **El dictamen es escrito, también al aprobar** (al menos 20 caracteres). El equipo lo ve como "Dictamen del asesor".
- **Fecha límite:** `fechaLimiteDictamen` cuenta los días de la ficha, hábiles o calendario.

**6. Documento solicitado:**
- **Nodo del plan:** cada actividad (`NodoPlan.documento`) tiene un campo "Documento que se entregará como prueba" en el editor del plan. Si la ficha lo pide como obligatorio, es un pendiente del plan.
- **Permisos:** un integrante solo cambia los documentos de sus propias actividades.
- **Ejecución:** la tarjeta de evidencias muestra "Documento que se espera: …"; una subactividad usa el de su actividad.

**7. Módulo puro `lib/fichas/protocolo.ts`:** `problemasProtocolo`, `textoPrecarga`, `sumarDias` y `fechaLimiteDictamen`.

## Pruebas

- **`verificar_fichas.ts`:** 131 comprobaciones; las 13 de I3 están en la sección 14. Todas pasan. Revisan:
  - los pendientes del protocolo;
  - la precarga del problema, la justificación, los objetivos y un texto nuevo;
  - los días hábiles: viernes + 5 cae el viernes siguiente, y en días calendario cae el miércoles;
  - que los ids no se repitan entre etapas;
  - el documento obligatorio, y que proyecto no lo pide;
  - quién puede cambiar el documento.
- **`verificar_flujo_proyecto.ts`:** tiene una etapa nueva "3b. Protocolo" (completo, ratificado sobre la versión enviada y dictamen escrito). Las propuestas 71 y 70 dan "Flujo coherente".
- **`tsc`** limpio; **`eslint`** sin errores en los archivos tocados.

**En el navegador (`dev-fichas`), propuesta 71:**
1. Se aprobó con el atajo `sembrar_equipo_investigacion.ts --aprobar`.
2. **Líder:** la pestaña Protocolo muestra las 15 partes y 12 pendientes.
   - Los objetivos aparecieron precargados con el general y los 4 específicos con su descripción. Se guardaron, y también la problemática y la justificación precargadas.
   - En la matriz de hipótesis se agregó una fila (hipótesis, variables e indicadores), que se guardó y se volvió a cargar con ✓.
3. Con los atajos `--completar-protocolo` y `--completar-plan` se llenaron las demás partes y el plan: 9 objetivos, sin presupuesto, con un documento por actividad.
4. **Documento en el plan:** al borrar el documento de 1.1.1.1 apareció el pendiente. Se escribió "Cuestionario aplicado a estudiantes (PDF)" y se guardó.
5. **Envío sin firmas:** el envío se rechazó con "Falta que ratifiquen …" y los 3 nombres.
6. **Ratificación:** el líder y los dos integrantes ratificaron. Para los integrantes, el protocolo se ve en solo lectura.
7. **Envío:** el líder envió, y la pantalla mostró "Dictamen del asesor a más tardar el 19 de noviembre de 2026 (5 días hábiles)": del jueves 12 al jueves 19.
8. **Asesor:** ve el protocolo en lectura y el documento de cada actividad.
   - "Aprobar" sin texto se rechaza con "Escribe el dictamen…".
   - Con el dictamen escrito, el plan quedó **Aprobado** y se muestra como "Dictamen del asesor".
9. **Proyecto:** el plan de la propuesta 70 sigue igual, sin pestañas ni documento. La consola no muestra errores.

**No probado en el navegador:**
- **El aviso "Documento que se espera" en la ejecución.** La ejecución de investigación todavía no se abre (es I4); el aviso compila y su lógica es una búsqueda directa en el plan.
- **La actualización inmediata de la lista de firmas.** En una ratificación, la lista tardó en actualizarse en pantalla. Al recargar estaba bien, y en la siguiente se actualizó sola.

## Pendiente

- **I4, ejecución:**
  - quitar el filtro `tipo = "proyecto"` en `/egresado/ejecucion`;
  - textos por modalidad;
  - marco teórico y referencias;
  - probar el aviso del documento esperado.
- **I5, informes:** la sección 6 con "Documento solicitado / Anexo", y el esqueleto del informe final por capítulos.
- **Dudas abiertas:** Q5 (quién redacta y las columnas definitivas de la matriz), Q6 (días hábiles) y Q8 (informe final).
