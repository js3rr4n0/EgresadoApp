# Entrega I4: ejecución de la investigación (12-nov-2026)

Ruta: [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md). Entregas anteriores: [I1](ENTREGA_I1.md), [I2](ENTREGA_I2.md) y [I3](ENTREGA_I3.md).

La ejecución de proyecto (P4) ya leía todo de la ficha, así que en investigación casi no hubo que agregar nada.

## Qué se hizo

**1. Se quitó el bloqueo.** `/egresado/ejecucion` buscaba solo propuestas con `tipo = "proyecto"`. Ahora también busca `investigacion`. El resto de la ejecución ya era genérico:
- `getEjecucionProyecto`;
- las evidencias;
- los informes;
- el "dar inicio" del coordinador, que exige el plan aprobado y los documentos de aprobación.

**2. Textos por modalidad** (`lib/fichas/textosModalidad.ts`). La modalidad sale de `DatosPlan.propuesta.tipo`, que es nuevo.
- El menú del egresado ahora dice "Ejecución del trabajo".
- **Pantalla de ejecución:**
  - el título es "Ejecución de la investigación";
  - el subtítulo es "Investigación como Trabajo de Graduación";
  - la nota "En investigación no se exige un mínimo de páginas".
- **Registro:**
  - "Se acumula en el objetivo y en la investigación";
  - la ayuda del marco teórico pide la parte del marco teórico o referencial elaborada en la actividad, citada en APA. En proyecto se mantiene el texto anterior.
- **Informe del período:**
  - "Modalidad investigación";
  - "del total de la investigación".

**3. Documento esperado.** Se agregó en I3 y ahora se probó en pantalla. La tarjeta de evidencias muestra "Documento que se espera: Cuestionario aplicado a estudiantes (PDF)…", que es el documento que el egresado escribió en el plan para esa actividad.

**4. Atajo de prueba** `sembrar_equipo_investigacion.ts --iniciar`:
- Da inicio a la ejecución si el protocolo y el plan están aprobados, sin pasar por los documentos de coordinación.
- Mueve el inicio de la carta al 15-oct-2026 para tener los períodos 1 y 2 abiertos, igual que se hizo con la propuesta 70.

## Pruebas (`dev-fichas`, propuesta 71)

- **Atajo:** `--iniciar` dejó la propuesta en ejecución desde el 15-oct.
- **Asesor:** `/asesor/ejecucion/71` muestra "Ejecución de la investigación".
- **Líder:**
  - "Ejecución del trabajo" abre la investigación, con 3 actividades del período 1.
  - En la 1.1.1.1 aparecen el documento esperado y la ayuda del marco teórico de investigación.
  - Registró 100 %, las acciones, el resultado y un marco teórico con una cita APA. Adjuntó el PDF "Cuestionario aplicado a estudiantes" y la envió: quedó **ENVIADA**.
- **Informe individual del período 1:** muestra "Modalidad investigación", el 11 % "del total de la investigación", el marco teórico y el **Anexo 1**.
- **Comprobaciones:**
  - `verificar_flujo_proyecto.ts`: "Flujo coherente" para la 71 (con 1 registro) y para la 70.
  - `verificar_fichas.ts`: todo en orden.
  - `tsc` y `eslint` limpios.

**Detalles vistos, que no son de esta entrega:**
- Al adjuntar una evidencia, la lista tarda en actualizarse; al recargar, aparece. Es el mismo comportamiento que en proyecto.
- Al recargar, se pierde lo escrito sin guardar.

## Pendiente para I5 (informes)

- **Sección 2 del informe del período.** Se llama "Cronograma y presupuesto…", pero investigación no lleva presupuesto: debe decir "Cronograma de actividades del período".
- **"Resultados por actividad".** Según el contexto, la tabla debe mostrar actividad, macroactividad, **documento solicitado** y anexo.
- **Informe final por capítulos dentro del sistema** (respuesta de Q8). Ver la propuesta en FICHA_INVESTIGACION.md §7.
