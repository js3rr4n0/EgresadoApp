# Ficha de INVESTIGACIÓN: estado y ruta (12-nov-2026)

**Encargo:** repetir con investigación lo que se hizo con proyecto (P0–P6, [FICHA_PROYECTO.md](FICHA_PROYECTO.md) y [FLUJO_PROYECTO.md](FLUJO_PROYECTO.md)). El recorrido va desde el constructor hasta un egresado o un equipo usando la ficha.

## 1. Hasta dónde está hecho

Igual que el proyecto antes de P0, **la investigación llega solo hasta la propuesta y su aprobación.** No tiene plan de trabajo, ejecución ni informes.

| Parte | Estado | Dónde |
|---|---|---|
| Crear la propuesta | El egresado elige "Investigación" y queda como líder. | `CrearPropuestaModalButton`, `initPropuesta` |
| Equipo | Funciona igual que en proyecto: invitar, aceptar, misma cohorte, ratificar y enviar. Ya se benefició de las correcciones de P0 (H1–H4). | `actions/proyecto.ts`, `actions/propuestas.ts` |
| Asistente | **7 pasos escritos a mano, sin leer la ficha.** Ver el detalle debajo de esta tabla. | `egresado/redactar/page.tsx` (ramas `isInvestigacion`) |
| Revisión, PDF y dictamen | Ya muestran los títulos de investigación ("Investigador", "de la Investigación"). | `imprimir/page.tsx`, `PropuestaProgresoClient`, `DictamenPropuestaClient` |
| Ficha base | `INV-BASE` describe los 7 pasos de hoy. No tiene etapas de plan ni de ejecución. | `lib/fichas/fichasBase.ts` |
| Constructor | Ya permite crear fichas `INV-…`. Al agregar las etapas de plan y ejecución, usa **los mismos valores que proyecto**: 5 informes, sin métrica, individual y general. | `lib/fichas/codigo.ts`, `lib/fichas/plantillas.ts` |
| Plan, ejecución e informes | El código lee las reglas de la ficha, no la modalidad, así que **casi todo se puede reutilizar**. Hoy no se alcanza por 3 bloqueos (ver §2). | `actions/planTrabajo.ts`, `actions/ejecucionProyecto.ts` |

**Los 7 pasos del asistente:**
1. Portada con equipo.
2. Actores: patrocinador, investigador y financista, sin ejecutor.
3. Carta.
4. Problema.
5. Justificación.
6. Objetivos: mínimo 4 específicos, fijo.
7. Documentos.

No tiene paso de **Alcance**, a diferencia de proyecto.

**Datos en `dev-fichas`:**
- Solo existe la ficha `INV-BASE` v1. No hay ninguna ficha `INV-…` propia.
- Hay 4 propuestas de investigación, ninguna ligada a una ficha:
  - 43, 48 y 69, en redacción;
  - 51, aprobada.
- Ninguna tiene integrantes en `integrantes_proyecto`.

## 2. Qué está amarrado a "proyecto"

1. `MODALIDADES_CON_FICHA = ["proyecto"]` (`lib/fichas/fichaDePropuesta.ts`). Por eso una investigación nunca recibe una ficha y siempre usa `INV-BASE`, que no tiene plan ni ejecución.
2. **El asistente de investigación está escrito a mano.** Tiene sus propios pasos y la condición `objetivosEspecificos.length >= 4`. Proyecto, en cambio, arma los pasos desde la ficha (`pasosProyecto`).
3. `/egresado/ejecucion` busca solo `tipo = "proyecto"`.
4. Los elementos **Recursos** (imagen, archivo, enlace y lista) del catálogo tienen `modalidades: ["proyecto"]`.
5. **Textos fijos que dicen "proyecto":**
   - el menú: "Ejecución del proyecto";
   - las pantallas de `components/proyecto/*` (ejecución, registro, informe del período);
   - la portada y los encabezados del informe del período.
6. `verificar_flujo_proyecto.ts` revisa una sola modalidad, aunque en la práctica solo depende de la ficha.

## 3. Contexto recibido (12-nov, documento "Contexto_Investigacion") — I0

**Fases del proceso:**
1. Presentación y valoración de la **propuesta**.
2. Presentación y valoración del **protocolo**, junto con el **plan de trabajo**.
3. **Desarrollo** de la investigación y elaboración del informe escrito.
4. **Presentación** de los resultados.

| Tema | Proyecto (ya hecho) | Investigación (según el contexto) | Qué implica |
|---|---|---|---|
| Equipo | De 1 a 3 integrantes, de la misma cohorte. | De 1 a 3 integrantes. **Pueden ser de distintas carreras.** Todos participan en todas las fases. | Lo mismo que proyecto. Revisar que nada exija la misma carrera. |
| Propuesta | 8 pasos, con carta y alcance. | Portada, problema, justificación, objetivos, **descripción narrativa de los objetivos**, actores y documentos. Debe fundamentarse teóricamente. **No menciona carta ni alcance.** | Nuevo bloque de texto "Descripción narrativa". Los actores van después de los objetivos (el orden lo da la ficha). La carta queda en duda: ver la pregunta Q1. |
| Plan de trabajo | Jerárquico, general e individual, con presupuesto. | **El mismo formato que proyecto**, con general e individual si es en grupo. | Se reutiliza tal cual. |
| **Protocolo** | No existe. | **Etapa nueva:** un documento con las partes listadas debajo de esta tabla. El asesor emite un dictamen escrito en **5 días hábiles** como máximo. | Es lo más nuevo. Ver §4. |
| Ejecución | Registro por actividad, sin marco teórico ni referencias, con evidencias. | Elaboración del **marco teórico o referencial**, y recopilación y análisis de datos según el cronograma del protocolo. | El marco teórico pasa a "sí" o "opcional", con referencias. |
| Informes del período | 5, individuales y general, con 7 secciones. | 5, con las **mismas 7 secciones**. La sección 6 es una tabla: actividad, macroactividad, **documento solicitado** y anexo. | Se reutiliza. Cada actividad del plan declara **qué documento se pide como prueba** (campo nuevo del nodo). |
| Informe final | Compilado, igual que en pasantía. | Un **documento por capítulos**, con las partes listadas debajo de esta tabla. | Se arma con partes del protocolo, las evidencias y capítulos nuevos. Ver I5. |
| Presentación de resultados | Sin definir. | Es la fase 4. | Un hito "Presentación de resultados" (personalizado) al final de la ejecución. |

**Partes del protocolo:**
- portada, índice e introducción;
- generalidades del estudio;
- problemática, justificación y objetivos;
- sistema de hipótesis, si procede: el enunciado y la **matriz de hipótesis**;
- metodología: el tipo de investigación, la población y la muestra, la técnica y los instrumentos, el procedimiento y el análisis;
- esquema del informe final;
- cronograma de actividades;
- bibliografía y anexos.

**Partes del informe final:**
- portada y autoridades académicas;
- índice, introducción y generalidades;
- problemática, justificación y objetivos;
- marco teórico y metodología (tipo, población y muestra, técnicas, procedimiento y análisis);
- resultados, comprobación de hipótesis (si procede) y hallazgos;
- conclusiones, bibliografía y anexos.

## 4. El protocolo: cómo encaja en la ficha

Hoy una ficha admite este orden: **propuesta → plan (opcional) → ejecución(es)** (`validar.ts`). El protocolo es un documento con espacios, igual que la propuesta, pero lo revisa **el asesor** y no admin → coordinador → asesor.

**Propuesta: una etapa nueva de tipo `"protocolo"`, entre la propuesta y el plan.**
```
Propuesta ─ aprobada ─► Protocolo + Plan de trabajo ─ dictamen del asesor (5 días) ─► Ejecución ─► Informe final ─► Presentación
```
- **Sus espacios son los mismos elementos del catálogo,** para no crear un asistente nuevo:
  - bloques de texto para la introducción, las generalidades, la metodología y sus partes, y el esquema del informe;
  - una **lista** para la bibliografía;
  - un **archivo** para los anexos y los instrumentos;
  - una **tabla** para la matriz de hipótesis. La tabla es la parte 2 de C1, que ya estaba pendiente.
- **Se precargan desde la propuesta:** la problemática, la justificación y los objetivos ya existen y no se vuelven a escribir. Solo se muestran o se ajustan.
- **El "Cronograma de actividades" del protocolo es el plan de trabajo.** El asesor revisa y dictamina las dos cosas juntas, igual que el plan de proyecto hoy (que ya trae `diasRevision: 5`).
- **Ratificación.** El líder redacta y los integrantes ratifican, como en la propuesta, porque "todos participan en todas las fases".
- **Si una ficha no tiene etapa de protocolo, nada cambia.** Proyecto y pasantía no se tocan.

## 5. Ruta ajustada

> **Avance:**
> - I1 está hecha ([ENTREGA_I1.md](ENTREGA_I1.md)).
> - I2 está hecha ([ENTREGA_I2.md](ENTREGA_I2.md)): INV-ING-001-SIST v1 está habilitada, y la propuesta 71 del equipo de prueba quedó enviada.
> - I3 está hecha ([ENTREGA_I3.md](ENTREGA_I3.md)): la 71 tiene el protocolo y el plan aprobados por el asesor, con dictamen escrito.
> - I4 está hecha ([ENTREGA_I4.md](ENTREGA_I4.md)): la 71 está en ejecución, con una actividad registrada y su evidencia.
> - I5, parte 1 ([ENTREGA_I5.md](ENTREGA_I5.md)): el informe del período sin presupuesto y con el documento solicitado. La parte 2, el informe final, espera las respuestas de §7.

| # | Entrega | Qué incluye | Resultado visible |
|---|---|---|---|
| **I1** | **Constructor: ficha INV completa** | Ver el detalle debajo de esta tabla. | Se crea **INV-ING-001** y se ve completa en la vista del egresado. |
| **I2** | **La propuesta usa la ficha** | Ver el detalle debajo de esta tabla. | Un equipo redacta, ratifica y envía una investigación con INV-ING-001. |
| **I3** | **Protocolo + plan de trabajo** | Ver el detalle debajo de esta tabla. | El asesor aprueba el protocolo y el plan de un equipo. |
| **I4** | **Ejecución** | Quitar el filtro `tipo = "proyecto"` en `/egresado/ejecucion` y usar textos por modalidad. Marco teórico con referencias según la ficha. Las evidencias se piden por el "documento solicitado" de cada actividad. | Cada integrante registra lo suyo. |
| **I5** | **Informes** | El informe del período reutiliza el de proyecto, con la sección 6 como "documento solicitado / anexo". **Informe final por capítulos:** primero su estructura y vista previa (con capítulos tomados del protocolo y las evidencias); la redacción completa puede quedar en "Próximamente". | Los informes 1 a 5 y el esqueleto del informe final. |
| **I6** | **Prueba completa** | `verificar_flujo_proyecto.ts` pasa a ser `verificar_flujo.ts` para cualquier modalidad con ficha. Pruebas en el navegador con un equipo de 3 (de distintas carreras) y con una persona sola. | El flujo de referencia de investigación. |

**I1, constructor:**
- La plantilla de investigación.
- La etapa **Protocolo** en el constructor: un editor de espacios, como el de la propuesta.
- El campo "documento solicitado" en el plan.
- Habilitar Recursos para investigación y agregar el elemento **Tabla**.
- Ejecución con marco teórico y referencias.
- Validaciones.

**I2, la propuesta usa la ficha:**
- Agregar `"investigacion"` a `MODALIDADES_CON_FICHA`.
- Retirar los pasos de investigación escritos a mano: el asistente guiado por la ficha conserva "Investigador" en los actores.
- Agregar el bloque "Descripción narrativa de los objetivos".
- Sembrar un equipo de prueba.

**I3, protocolo + plan de trabajo:**
- Tabla nueva `respuestas_protocolo`, o reutilizar `respuestas_espacios` con la etapa (se decide en I3).
- Pantalla de redacción del protocolo y ratificación.
- El asesor revisa y emite el dictamen de protocolo y plan.
- Notificaciones.

## 6. Dudas que quedan (se pueden responder durante las etapas)

- ~~**Q1, carta de aceptación**~~. **Respondida el 12-nov: sí pide carta.** La ejecución empieza en la fecha de la carta.
- ~~**Q2, alcance**~~. **Respondida el 12-nov: no se agrega.**
- ~~**Q3, descripción narrativa**~~. **Respondida el 12-nov: ya existe.** Es la descripción de cada objetivo en el paso "Objetivos".
- ~~**Q4, presupuesto**~~. **Respondida el 12-nov: el plan de investigación no lleva presupuesto.**
- **Q5, protocolo e hipótesis** (I3).
  - ¿El protocolo lo redacta solo el líder, o cada integrante su parte?
  - **La matriz de hipótesis queda provisionalmente con Hipótesis, Variables e Indicadores**, hasta la reunión.
- **Q6, días hábiles** (I3). El dictamen es a "5 días hábiles". Desde I3 se cuentan sin sábados ni domingos; la ficha permite cambiarlo a días calendario. Falta confirmar si los feriados también se descuentan.
- ~~**Q7, documento solicitado**~~. **Respondida el 12-nov: lo escribe el egresado en el plan.** Al subir las evidencias se le recuerda qué documento se espera.
- ~~**Q8, informe final**~~. **Respondida el 12-nov:** lo ideal es redactarlo dentro del sistema, con mucho cuidado, porque es el documento final de la investigación (la tesis). Ver §7.


## 7. Informe final dentro del sistema (Q8): propuesta para I5

El informe final es la tesis. Si se redacta en el sistema, perder o corromper texto no es aceptable. **Propuesta de cuidados**, para validar antes de construirlo:

1. **Capítulos como espacios de una etapa "Informe final" de la ficha.** Es el mismo mecanismo que la propuesta y el protocolo, con las partes del contexto:
   - portada, autoridades e índice, que se generan;
   - introducción, generalidades, problemática, justificación y objetivos, que se precargan del protocolo;
   - marco teórico, que se precarga con lo registrado en las actividades;
   - metodología;
   - resultados, comprobación de hipótesis, hallazgos y conclusiones;
   - bibliografía y anexos, con las evidencias numeradas.
2. **Nada se sobrescribe.** Cada guardado de un capítulo crea una **versión nueva**, con su autor y su fecha. El historial se puede ver y comparar, y se puede volver a una versión anterior.
3. **Guardado automático** del borrador cada pocos segundos, con un aviso si se cierra la página con cambios sin guardar.
4. **Edición por capítulo** con un aviso de "otro integrante está editando". Si dos guardan a la vez, gana el primero y el segundo recibe un aviso: es el mismo control de versión que ya usa el plan de trabajo.
5. **Revisión por capítulo.** El asesor comenta o aprueba cada capítulo. Al final, el equipo ratifica la versión completa, igual que la propuesta.
6. **Exportar en todo momento** a PDF y Word, con el formato institucional. Así el equipo siempre tiene su copia fuera del sistema.
7. **Versión final congelada.** Una vez aprobada no se edita, y queda su huella para comprobar que el documento presentado es el aprobado.

**Para empezar I5 conviene confirmar:**
- ¿Redactan todos los integrantes, cada uno sus capítulos, o solo el líder?
- ¿El asesor revisa por capítulo o el documento completo?
- ¿Hay un formato institucional (márgenes, fuente, normas APA 7) que el PDF deba respetar?
