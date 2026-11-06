# Flujo de referencia: ficha de PROYECTO de punta a punta (P6, 6-nov-2026)

Este documento resume cómo funciona la ficha de proyecto desde que se crea en el constructor hasta el informe del período aprobado. Sirve de referencia para las demás modalidades. El detalle de cada parte está en las entregas: [P0 y P1](ENTREGA_P0_P1.md), [P2](ENTREGA_P2.md), [P3](ENTREGA_P3.md), [P4](ENTREGA_P4.md) y [P5](ENTREGA_P5.md). El contexto y las preguntas pendientes están en [FICHA_PROYECTO.md](FICHA_PROYECTO.md).

## 1. El recorrido

```
 Admin              Equipo (líder + integrantes)               Asesor              Coordinación
 ─────              ────────────────────────────               ──────              ────────────
 1 Ficha PRO ──►    2 El líder crea la propuesta (toma la ficha)
   habilitada       3 Invita (misma cohorte, máx. de la ficha)
                    4 El líder redacta los pasos de la ficha
                    5 Todos ratifican ──► el líder envía ───►   6 Revisión de la propuesta (fase 1)
                    7 Plan de trabajo: el líder estructura y
                      asigna; cada uno completa lo suyo ─────►  8 Aprueba u observa el plan
                                                                                    9 Da inicio
                                                                                      (exige el plan aprobado)
                   10 Ejecución: cada uno registra SUS
                      actividades del período ───────────────► 11 Aprueba u observa cada registro
                   12 Informe individual de cada uno,
                      y el líder envía el general ───────────► 13 Aprueba u observa el general
```

| Etapa | Qué lee de la ficha | Pantallas | Tablas |
|---|---|---|---|
| Ficha | Todo | `/admin/bloques-propuestas/[id]` (pestañas Propuesta, Plan de trabajo y Ejecución) | `fichas`, `fichas_versiones` |
| Propuesta | Orden, título y ayuda de los pasos; límites de palabras de los textos nuevos; objetivos mínimos y máximos; máximo de integrantes; misma carrera | `/egresado/redactar` | `propuestas.ficha_version_id`, `respuestas_espacios` y las de la fase 1 |
| Plan de trabajo | Niveles; mínimos por integrante, objetivo y macroactividad; presupuesto y columnas; nivel del responsable; plan individual; panel de carga; revisión | `/egresado/plan`, `/asesor/plan/[id]` | `planes_trabajo` |
| Ejecución | Períodos, duración y subperíodos; registro por actividad; avance (lo incompleto pasa al período siguiente); palabras; marco teórico; evidencias por actividad | `/egresado/ejecucion`, `/asesor/ejecucion/[id]` | `registros_plan`, `evidencias_plan` |
| Informes | Modo (individual y general, o uno por trabajo); exigir actividades aprobadas | `/egresado/ejecucion/informe`, `/asesor/ejecucion/[id]/informe` | `informes_plan` |

**Reglas que siempre se cumplen:**
- todos los integrantes son de la misma cohorte que la propuesta;
- solo el líder envía la propuesta, el plan y el informe general;
- el sistema no decide si el reparto es equitativo: el asesor lo juzga con el panel de carga;
- cada integrante solo modifica lo que está a su cargo, y el servidor lo valida;
- los avisos llegan a todo el equipo.

## 2. Cómo se comprueba

```
npx tsx scripts/fichas/verificar_fichas.ts
npx tsx --env-file=.env.local scripts/fichas/verificar_flujo_proyecto.ts <propuestaId>
```

- **`verificar_fichas.ts`:** 64 comprobaciones del modelo, sin base de datos. Cubre las fichas base, la validación, las sumas del plan, los permisos, el avance y los informes.
- **`verificar_flujo_proyecto.ts`:** de solo lectura. Revisa que una propuesta sea coherente de punta a punta:
  - la ficha;
  - el equipo (cohorte y máximo);
  - las firmas de la misma versión;
  - el plan, que cumple la ficha;
  - los registros, cada uno hecho por su responsable;
  - los informes, donde el general es la suma de los individuales.

**Resultado con la propuesta 70 de `dev-fichas`:** "Flujo coherente", con un aviso: su envío no quedó en el historial, porque fue anterior a esa corrección.

**Lo que cubrió la prueba completa en el navegador,** con la propuesta 70: todas las etapas, del 1 al 13, en el orden del recorrido, con los usuarios reales de cada rol. Los atajos se usaron solo donde el paso de la fase 1 ya funcionaba o era repetitivo:

| Atajo | Para qué |
|---|---|
| `--aprobar` | La revisión de la propuesta de la fase 1. |
| `--completar-plan` | Completar el plan hasta los mínimos de la ficha (9 objetivos). |
| `--iniciar` | Dar inicio sin subir los documentos de aprobación. |
| `--registrar-periodo` | 8 de los 9 registros del período. |

Durante P6 se repitió en el navegador el cierre del período 1 completo:
1. los 3 integrantes entregaron su informe individual;
2. el líder envió el general;
3. el asesor pidió ajustes;
4. el líder lo reenvió;
5. el asesor lo aprobó, y los individuales quedaron aprobados junto con él.

## 3. Guion para la demostración

Los datos son de `dev-fichas`. Las contraseñas son las de demostración.

| Rol | Usuario |
|---|---|
| Admin | `admin@uni.test` |
| Líder | `pro.lider@prueba.test` |
| Integrantes | `pro.integrante1@prueba.test`, `pro.integrante2@prueba.test` |
| Asesor | `Marco.solis@catolica.edu.sv` |

1. **Admin:** Fichas → PRO-ING-001-SIST → versión 2. Mostrar las pestañas Propuesta, Plan de trabajo (con el cronograma de ejemplo y la carga por integrante) y Ejecución (sin métrica, informe individual y general). Después, la Vista del egresado.
2. **Líder:** "Envío de Propuestas" → la propuesta 70 con los 9 pasos de la ficha, el equipo y las firmas.
3. **Líder:** "Plan de trabajo" → el plan general, "Mi plan" y la carga por integrante.
4. **Integrante:** "Plan de trabajo" muestra que solo puede editar lo suyo. "Ejecución del proyecto" muestra sus actividades del período y el estado del equipo.
5. **Asesor:** la propuesta 70 → "Ver plan" y "Ejecución del equipo" → quién hizo qué y los informes del período.
6. **Informe general del período 1:** portada, cronograma y presupuesto ($875), avances (73 %), resultados e "Imprimir / PDF".

**Para repetir la demostración desde cero:** `sembrar_equipo_proyecto.ts --borrar` y después `sembrar_equipo_proyecto.ts`. Luego se recorre el flujo, usando los atajos si hace falta. El borrado solo afecta a los datos de prueba (los 3 egresados, su cohorte y sus propuestas).

## 4. Cómo llevarlo a las demás modalidades

La pieza que se reutiliza es la misma: **la ficha decide y el sistema la lee**. Para cada modalidad hace falta lo siguiente:

**Investigación (la más cercana):**
- agregarla en `MODALIDADES_CON_FICHA` (`lib/fichas/fichaDePropuesta.ts`);
- que el asistente de investigación arme sus pasos con la ficha, como ya lo hace proyecto en `redactar/page.tsx` (`tipoPasoProyecto`);
- el plan, la ejecución y los informes funcionan igual, porque el código no depende de la modalidad, sino de las etapas de la ficha;
- pregunta abierta: ¿la investigación lleva presupuesto y cronograma igual que el proyecto?

**Pasantía (entrega 4 original):**
- el asistente debe leer la ficha (orden, ayudas y reglas), con el mismo mecanismo de pasos de proyecto, pero con los formularios de pasantía;
- el cronograma sigue dentro de la propuesta: la validación no permite un plan de trabajo en pasantía;
- la ejecución sigue con el registro por subperíodo (`registrosActividad.ts`). Para que lea la ficha hay que pasarle los períodos, los subperíodos y la métrica, que hoy son constantes;
- antes de empezar: los pendientes de la fase 1 (O3, las pruebas de la pasada 1).

**Mixta (Medicina) y especialización:** la ficha ya permite varias etapas de ejecución seguidas. Falta definir cómo se encadenan las fechas y si cada etapa tiene su propio plan.

**Lo que no hace falta repetir:**
- el modelo de equipo (cohorte, máximo, permisos y avisos);
- los nodos del plan con id estable;
- las sumas y el avance por nivel;
- el armado del informe;
- los scripts de verificación.

## 5. Pendiente

**Decisiones para el asesor** (FICHA_PROYECTO.md §7, todas con un valor por defecto ya aplicado):
1. ¿El mínimo de objetivos depende del tamaño del equipo? Hoy son 3 por integrante, y la propuesta permite hasta 6.
2. ¿El responsable se asigna por objetivo o por actividad? Hoy, por objetivo; se configura en la ficha.
3. ¿El presupuesto es un monto, o recursos y gastos? Hoy, un monto; se configura en la ficha.
4. ¿Quién arma el informe general? Hoy se arma solo y lo envía el líder.
5. ¿El registro se hace por actividad? Hoy sí, con su avance en cada período.

**Otras preguntas:**
- ¿Mismas carreras en el equipo?
- ¿Fichas especiales para casos como el proyecto para la universidad, que solo entrega el informe final?
- ¿Qué versión usa cada cohorte? (entrega 3)

**Funciones que faltan:**
- solicitudes de cambio al cronograma durante la ejecución;
- primer contacto y demás hitos de la ejecución de proyecto;
- informe final compilado (Cierre);
- respuestas de los espacios nuevos en el PDF de la propuesta y en las vistas de revisión;
- fechas reales en las columnas del plan;
- que el asesor, al observar un informe, pueda reabrir los registros a corregir. Hoy el informe se arma con registros ya aprobados y bloqueados.

**De la fase 1, detectado en el camino:**
- en el panel del integrante, una propuesta en redacción aparece como "enviada";
- después de enviar, el panel del líder dice "asignada a la Coordinación";
- la revisión de la fase 1 habla de aprobar "el plan y la propuesta" juntos.
