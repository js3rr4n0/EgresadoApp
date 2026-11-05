# Ficha de proyecto: entrega P3, plan de trabajo del equipo (5-nov-2026)

Ruta completa en [FICHA_PROYECTO.md](FICHA_PROYECTO.md) §6. La entrega anterior está en [ENTREGA_P2.md](ENTREGA_P2.md).

## Qué hace

Después de que se aprueba la propuesta, el equipo arma su plan de trabajo con las reglas de la etapa "Plan de trabajo" de su ficha. El asesor lo revisa y lo aprueba, o pide ajustes.

| Quién | Qué puede hacer |
|---|---|
| **Líder** | Estructura el plan. Agrega objetivos, asigna el responsable de cada objetivo específico (o de cada actividad, según la ficha) y envía el plan al asesor. |
| **Integrante** | Completa solo lo que está a su cargo: títulos, macroactividades, actividades, subactividades y montos debajo de lo suyo. No asigna responsables ni envía. El servidor rechaza cualquier cambio fuera de lo suyo (`cambioNoPermitido`). |
| **Asesor** | Ve el plan en solo lectura, con el panel de carga por integrante. Aprueba, o pide ajustes con un comentario obligatorio. |

**Cómo se ve el plan:**
- **Estructura:**
  - empieza con el objetivo general y los objetivos específicos de la propuesta aprobada;
  - debajo van las macroactividades, las actividades y las subactividades (estas últimas según la ficha);
  - la numeración (1, 1.1, 1.1.1…) se recalcula sola.
- **Presupuesto:** cada actividad lleva su monto en las columnas de la ficha (subperíodos o períodos de la ejecución), y cada nivel suma los de sus hijos hasta el objetivo general. Si la ficha no lleva presupuesto, se marca en qué columnas se ejecuta cada actividad.
- **Vistas:** "General" o el plan individual de cada integrante, que es el general filtrado por responsable y conserva los niveles superiores.
- **Pendientes antes de enviar,** según los mínimos de la ficha:
  - títulos;
  - macroactividades por objetivo y actividades por macroactividad;
  - columnas o montos de cada actividad;
  - responsables;
  - objetivos por integrante.

  **El reparto equitativo no lo valida el sistema:** lo decide el asesor con el panel de carga.

**Ciclo de revisión:** el plan pasa por "en elaboración", "enviado", "con observaciones" (y se reenvía) y "aprobado". En cada paso se avisa al líder y a los integrantes, y el asesor recibe el aviso de envío.

**Requisito para iniciar:** si la ficha tiene plan de trabajo, coordinación no puede dar inicio a la ejecución hasta que el asesor lo apruebe (`darInicioPlanTrabajo`).

**Dónde se ve:**
- **Egresado:** la nueva opción "Plan de trabajo" del menú (`/egresado/plan`).
- **Asesor:** un aviso en la página de la propuesta, con su estado y el botón "Revisar plan" (`/asesor/plan/[id]`).

## Base de datos

`scripts/fichas/crear_planes_trabajo.ts`. Solo agrega, y se puede ejecutar más de una vez.

Crea la tabla `planes_trabajo`, con una fila por propuesta:
- `arbol` (JSON) y `columnas`;
- `version`, que evita que dos integrantes se pisen al guardar;
- `estado`;
- el comentario del asesor y las fechas.

**Por qué un documento JSON y no una tabla por nodo:** el plan se edita y se guarda completo, y lo editan varias personas. Con un solo documento con versión, cada guardado es una operación atómica y fácil de validar. Cada nodo tiene un **id estable**; los registros de la ejecución (P4) apuntarán a él.

## Datos de prueba

El script `sembrar_equipo_proyecto.ts` tiene dos opciones nuevas, solo para desarrollo:
- **`--aprobar`** deja la propuesta enviada del líder de prueba como aprobada, con el coordinador y el asesor de demostración, y lo registra en el historial. Es un atajo: no recorre la revisión de la fase 1.
- **`--completar-plan`** completa el plan hasta los mínimos de la ficha (3 objetivos por integrante, cada uno con una macroactividad y una actividad con montos). No toca lo que el equipo ya escribió.

## Comprobado en el navegador

Sobre `dev-fichas`, con la propuesta 70 (PRO-ING-001-SIST versión 2):

1. **Inicio del plan:** el líder abrió el plan, que tomó el objetivo general y los 3 objetivos de la propuesta, con 20 columnas (5 períodos × 4 subperíodos).
2. **Líder:**
   - asignó cada objetivo a un integrante;
   - agregó una macroactividad y una actividad con $120 y $80;
   - las sumas subieron por cada nivel hasta el objetivo general ($200);
   - guardó.
3. **Integrante Uno:**
   - solo pudo editar su objetivo (1.2), sin asignar responsables ni enviar;
   - agregó una macroactividad y una actividad con $150, y guardó, y el servidor aceptó el cambio;
   - el panel de carga mostró la parte de cada uno.
4. **Plan completo:** con `--completar-plan`, el plan quedó con 9 objetivos (3 por integrante) y sin pendientes. El plan individual del integrante Uno mostró solo sus ramas, con el mismo total que el panel ($500).
5. **Primer envío:** el líder envió el plan.
6. **Asesor, primera revisión:**
   - sin comentario, "Pedir ajustes" se rechazó;
   - con comentario, el plan pasó a "Con observaciones".
7. **Corrección:** el líder vio la observación, renombró un objetivo, guardó y reenvió.
8. **Asesor, segunda revisión:** aprobó el plan.
9. **En la base:** el plan quedó aprobado en la versión 5, y los avisos de envío, observaciones y aprobación les llegaron a los 3 integrantes y al asesor. Con eso también queda probada en la práctica la notificación al equipo de P0.

Además: `tsc` sin errores, `verificar_fichas.ts` 54 de 54 (7 nuevas: validación del plan del equipo y permisos por integrante), y ESLint sin errores nuevos.

## No probado todavía

- **El bloqueo de "Dar inicio" sin plan aprobado:** el botón también exige los documentos de aprobación, que la propuesta 70 no tiene. Se verificó por código.
- **Dos integrantes guardando a la vez:** el control de versión se verificó por código.

## Limitaciones conocidas

- **La revisión del asesor sobre la propuesta** (la pantalla de la fase 1) sigue hablando de aprobar "el plan de trabajo y la propuesta" juntos. En proyecto con ficha, el plan ahora se aprueba aparte.
- **Columnas del plan:** se muestran como P1·S1, y todavía no con las fechas reales, que se calcularán con la carta en P4.
- **El PDF y el dictamen del plan** todavía no incluyen el plan nuevo. Van con la plantilla de documentos.

## Siguiente: P4

La ejecución en equipo: cada integrante registra las actividades de su plan individual, con avance, resultados y anexos, y el asesor ve quién hizo qué.
