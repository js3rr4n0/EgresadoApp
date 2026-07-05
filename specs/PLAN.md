# PLAN DE DESARROLLO — Sistema de Procesos de Graduación

**Uso:** guardar como `specs/PLAN.md` en el repo. En Antigravity, cada tarea del agente referencia UNA sub-fase de este plan. Regla de oro: no se avanza de fase sin su checklist de pruebas en verde.

---

## Stack

- Next.js App Router + TypeScript
- NextAuth v5 (credenciales) + RBAC en middleware
- PostgreSQL (Neon)
- Archivos (PDFs, firmas, organigramas): Vercel Blob o Cloudflare R2
- Vitest (unit) + Playwright (E2E)
- Tailwind + shadcn/ui

## Orden de construcción

| # | Fase | Por qué en este orden |
|---|------|----------------------|
| 0 | Cerrar specs (permisos + estados) | El doc solo cubre bien admin y egresado/pasantía |
| 1 | DB: schema + seed + reset | Todo depende de esto |
| 2 | Auth + RBAC + 4 shells de dashboard | Los 4 roles enrutados desde el día 1 |
| 3 | Módulo Admin | El egresado consume lo que el admin configura |
| 4 | Egresado: gate de documentos | Prerequisito duro de todo el flujo |
| 5 | Egresado: propuesta pasantía | Núcleo del sistema (6 sub-fases) |
| 6 | Revisión admin/decanato | Cierra el ciclo enviar → aprobar |
| 7 | Asesor + plan de trabajo | Consume propuestas aprobadas |
| 8 | Proyecto, informes mensuales, notificaciones | Specs incompletas hoy |

---

## FASE 0 — Cerrar specs (sin código, ~medio día)

Los agentes de un IDE agéntico rellenan huecos con suposiciones cuando la spec es ambigua. Cerrar esto primero ahorra semanas.

### 0.1 Matriz de permisos (borrador — confirmar ✱ con la universidad)

| Acción | Admin | Decanato | Asesor | Egresado |
|---|---|---|---|---|
| Crear usuarios (manual + CSV) | ✅ | ❌ | ❌ | ❌ |
| Configurar fechas clave del periodo | ✅ | ❌ | ❌ | ❌ |
| Habilitar/deshabilitar empresas | ✅ | ✱ | ❌ | ❌ |
| Aprobar/rechazar empresa nueva | ✅ | ✅ | ❌ | ❌ |
| Aprobar/rechazar datos de empresa | ✅ | ✅ | ❌ | ❌ |
| Aprobar/rechazar propuestas | ✅ | ✅ | ❌ | ❌ |
| Carga masiva CSV | ✅ | ✱ | ❌ | ❌ |
| Ver propuestas (de su facultad) | ✅ | ✅ | ✱ | ❌ |
| Crear/editar plan de trabajo | ❌ | ❌ | ✅ | ❌ |
| Subir documentos / crear propuestas | ❌ | ❌ | ❌ | ✅ |

### 0.2 Máquina de estados de propuesta

```
redactando ──(empresa nueva)─────────→ pend_empresa_nueva
redactando ──(datos modificados)─────→ pend_revision_datos
redactando ──(empresa existente ok)──→ [completa fases] → enviada

pend_empresa_nueva  → empresa_aprobada  → [completa fases] → enviada
pend_empresa_nueva  → empresa_rechazada → redactando (justificación opcional visible)
pend_revision_datos → datos_aprobados   → [completa fases] → enviada
pend_revision_datos → datos_rechazados  → (elige empresa válida o manda otra nueva)

enviada → aprobada  (bloquea las otras 2 propuestas, habilita "Ver plan de trabajo")
enviada → rechazada (bloquea toda la propuesta, se pide crear otra)
```

Reglas transversales:
- `pend_empresa_nueva` tiene **prioridad** sobre `pend_revision_datos`.
- En estados `pend_*` solo se pueden mandar: Portada, Datos empresariales, Carta de aceptación. El resto queda bloqueado.
- El estado es visible SIEMPRE para el egresado (badge en la propuesta).

### 0.3 Preguntas abiertas (mandarlas a la universidad esta semana)

1. ¿Decanato puede habilitar/deshabilitar empresas y usar carga CSV, o solo aprueba?
2. Spec completa del rol **asesor** (el doc no lo define; solo se infiere que crea el plan de trabajo desde las actividades).
3. Spec de la propuesta tipo **Proyecto** (el documento se corta a media sección).
4. Formato y entrega del **informe mensual**.

---

## FASE 1 — Base de datos (Neon)

### Tablas

```sql
-- catálogo
facultades(id, nombre)
carreras(id, facultad_id→facultades, nombre)

-- usuarios (4 roles)
usuarios(id, nombre_completo, correo UNIQUE, password_hash,
  rol CHECK IN ('admin','decanato','asesor','egresado'),
  carnet, carrera_id→carreras, facultad_id→facultades,
  activo BOOL, carreras_asignadas JSONB)   -- asignadas: asesor/decanato

-- periodo administrativo (fechas clave del admin)
periodos(id, inicio_recepcion DATE, fin_recepcion DATE,
  fecha_primer_informe DATE, fecha_informe_final DATE, activo BOOL)

-- empresas y supervisores
empresas(id, nombre, area, descripcion, antecedentes,
  organigrama_url, mapa_url, habilitada BOOL DEFAULT true,
  verificada BOOL, actualizada_en)
supervisores(id, empresa_id→empresas, titulo, especialidad,
  nombres, apellidos, cargo, telefono, correo, firma_url, actualizado_en)

-- gate de documentos del egresado
documentos_egresado(id, egresado_id→usuarios,
  tipo CHECK IN ('servicio_social','certificacion_notas','pago_tg'),
  archivo_url, subido_en, UNIQUE(egresado_id, tipo))

-- propuestas (máx 3 por egresado por periodo)
propuestas(id, egresado_id→usuarios, periodo_id→periodos,
  tipo CHECK IN ('pasantia','proyecto'),
  numero SMALLINT CHECK (numero BETWEEN 1 AND 3),
  estado CHECK IN ('redactando','pend_empresa_nueva','pend_revision_datos',
    'empresa_aprobada','empresa_rechazada','datos_aprobados','datos_rechazados',
    'enviada','aprobada','rechazada'),
  empresa_id→empresas NULL, supervisor_id→supervisores NULL,
  justificacion_proceso TEXT, enviada_en TIMESTAMPTZ,
  bloqueada BOOL DEFAULT false,
  UNIQUE(egresado_id, periodo_id, numero))

-- carta de aceptación (1:1 con propuesta de pasantía)
cartas_aceptacion(id, propuesta_id UNIQUE→propuestas, archivo_url,
  fecha_emision DATE, fecha_inicio DATE, fecha_fin DATE,
  sup_titulo, sup_nombres, sup_apellidos, sup_cargo, sup_telefono, sup_correo,
  emisor_nombre, emisor_cargo, emisor_firma_url,
  bloqueada BOOL DEFAULT false)

-- actividades con código P.S.N (periodo.semana.numero)
actividades(id, propuesta_id→propuestas, periodo SMALLINT, semana SMALLINT,
  numero SMALLINT, descripcion TEXT,
  UNIQUE(propuesta_id, periodo, semana, numero))
semanas_justificadas(id, propuesta_id→propuestas, periodo, semana,
  justificacion TEXT NOT NULL, UNIQUE(propuesta_id, periodo, semana))

-- verificación de empresa (nueva o modificada), payload propuesto en JSONB
solicitudes_empresa(id, propuesta_id→propuestas, empresa_id→empresas NULL,
  tipo CHECK IN ('nueva','modificacion'),
  datos JSONB,   -- empresa + supervisor propuestos por el egresado
  estado CHECK IN ('pendiente','aprobada','rechazada'),
  justificacion_rechazo TEXT, revisado_por→usuarios, revisado_en)

-- trazabilidad
historial_estados(id, propuesta_id→propuestas, de, a, usuario_id→usuarios, creado_en)
notificaciones(id, usuario_id→usuarios, tipo, mensaje, leida BOOL, creado_en)
temas_historicos(id, titulo, asesor_nombre, tipo, estado,
  carrera_id→carreras, facultad_id→facultades, carnets TEXT[],
  fecha_inicio, fecha_fin)
```

### Scripts obligatorios (los agentes los usan para probar en loop)

- `npm run db:migrate` — aplica migraciones
- `npm run db:seed` — datos de prueba
- `npm run db:reset` — drop + migrate + seed

Seed mínimo: 1 facultad, 2 carreras, 4 usuarios (1 por rol), 3 empresas con supervisores (2 habilitadas, 1 deshabilitada), 1 periodo activo.

### ✅ Pruebas F1

- [ ] `db:reset` corre 2 veces seguidas sin error (idempotente)
- [ ] Insertar propuesta #4 del mismo egresado falla (constraint)
- [ ] FKs y CHECKs de estado rechazan valores inválidos

---

## FASE 2 — Auth + RBAC + shells

- NextAuth v5 con credenciales contra `usuarios`
- Middleware: `/admin/**` solo admin; `/decanato/**` decanato; `/asesor/**` asesor; `/egresado/**` egresado
- 4 layouts con sidebar propio y dashboard vacío
- Al login, redirect automático según rol

### ✅ Pruebas F2 (E2E)

- [ ] Login correcto por cada rol → llega a su dashboard
- [ ] Acceso cruzado denegado (probar las 12 combinaciones rol × área ajena)
- [ ] Logout y expiración de sesión funcionan

---

## FASE 3 — Módulo Admin

- **3.1 Usuarios:** CRUD manual + import CSV (validación por fila, reporte de errores con número de línea).
- **3.2 Fechas clave:** admin ingresa `inicio_recepcion` → el sistema autocalcula las demás → editables → al confirmar, pide `fecha_primer_informe` y `fecha_informe_final`. Se guarda como periodo activo.
- **3.3 Empresas:** listado con toggle habilitada/deshabilitada (sin justificación, según el manual).
- **3.4 Carga masiva CSV:** facultades, carreras, usuarios, empresas+supervisores, temas históricos. Plantilla CSV descargable por tipo.

### ✅ Pruebas F3

- [ ] CSV con filas malas → reporta línea y motivo (decidir: skip por fila o rollback total, y documentarlo)
- [ ] Autocálculo de fechas correcto y editable manualmente
- [ ] Empresa deshabilitada NO aparece en el selector del egresado (se re-verifica en F5)

---

## FASE 4 — Egresado: gate de documentos

Primer login del egresado: única pantalla disponible = subir los 3 documentos (carta de servicio social, certificación de notas, comprobante de pago TG). El middleware bloquea todo lo demás hasta tener los 3.

### ✅ Pruebas F4

- [ ] Sin docs: cualquier ruta de egresado redirige al gate
- [ ] Con 2/3 docs: sigue bloqueado
- [ ] Con 3/3: se habilita el dashboard y "Crear propuesta"

---

## FASE 5 — Egresado: propuesta de pasantía (núcleo)

Una sub-fase = una tarea de agente. En este orden:

### 5.1 CRUD de propuestas + Portada
- Máx 3 propuestas; solo 1 puede enviarse (las otras 2 funcionan de backup)
- Portada autorrellenada: nombres, carnet, título a optar, mes de envío, fecha inicio/fin, empresa — todo editable
- Estado inicial `redactando`, badge de estado siempre visible

### 5.2 Carta de aceptación
- Flujo: subir PDF de la carta → llenar formulario → la etapa se BLOQUEA (no editable mientras llena datos de empresa)
- Campos: fecha emisión, fecha inicio, fecha fin, supervisor (título, nombres, apellidos, cargo, tel, email), emisor (nombre, cargo, firma como imagen)
- Validaciones de fecha (unit tests obligatorios):
  - `fecha_inicio ≥ fecha estimada de envío + 21 días` (validar contra HOY al llenar, y REVALIDAR al momento de enviar la propuesta)
  - `fecha_fin − fecha_inicio` entre **150 y 155 días** (mostrar la fecha fin calculada, observable)
- Mensaje exacto si falla: **"Las fechas colocadas no concuerdan con el periodo establecido, por favor ingrese otra fecha"**
- Advertencia fija antes del botón "Siguiente fase": **"Si alguno de los datos digitados son diferentes a los de la carta de aceptación de la propuesta, su propuesta será RECHAZADA"**

### 5.3 Datos empresariales (3 caminos)
- a) Empresa existente sin cambios → selecciona y sigue normal
- b) Empresa existente con datos modificados → crea `solicitudes_empresa(tipo=modificacion)`, estado → `pend_revision_datos`
- c) Empresa nueva → `solicitudes_empresa(tipo=nueva)`, estado → `pend_empresa_nueva` (prioridad sobre b)
- En b y c: solo puede mandar Portada + Datos + Carta; el resto bloqueado
- Selector de supervisor **filtrado por especialidad compatible con la carrera del egresado** (tabla de mapeo carrera ↔ especialidades)

### 5.4 Actividades (grid periodos → semanas)
- Código autogenerado `periodo.semana.numero` (formato 0.0.0)
- Total **21–22 semanas** documentadas; mínimo **4 actividades por semana**
- Semana sin actividades → justificación escrita OBLIGATORIA (vacaciones/asuetos)
- Descripción breve por actividad
- Cronograma autogenerado a partir de las actividades

### 5.5 Justificación del proceso + adjuntos automáticos
- Textarea de justificación del proceso
- Los 3 documentos del gate se adjuntan automáticamente a la propuesta

### 5.6 Enviar propuesta
- Validación completa de todas las etapas → estado `enviada`, registrar `enviada_en`
- Solo 1 propuesta en estado enviada/aprobada por egresado a la vez

### ✅ Pruebas F5 (las más importantes del sistema)

Unit (Vitest):
- [ ] Reglas de fechas con casos borde: 149, 150, 155, 156 días; inicio a 20 vs 21 días
- [ ] Validador de actividades: 20/21/22/23 semanas; 3 vs 4 actividades; semana vacía con/sin justificación
- [ ] Tabla de transiciones de estado: todas las válidas pasan, las inválidas lanzan error
- [ ] Filtro supervisor ↔ carrera

E2E (Playwright):
- [ ] Flujo feliz completo con empresa existente → `enviada`
- [ ] Camino empresa nueva: bloquea las etapas correctas
- [ ] Fechas inválidas muestran el mensaje exacto
- [ ] Crear una 4ta propuesta es imposible

---

## FASE 6 — Revisión (admin y decanato)

- **Cola "Empresas por verificar":** solicitudes nuevas y modificaciones; mostrar diff entre payload propuesto y datos actuales; aprobar / rechazar con justificación opcional
  - Aprobada (nueva) → crea empresa+supervisor reales, propuesta → `empresa_aprobada`, aviso al egresado: **"La empresa ha sido validada y registrada correctamente, complete el resto de su propuesta"**
  - Rechazada → transición según máquina de estados + justificación visible al egresado
- **Cola "Propuestas enviadas":** vista completa de la propuesta (todas las secciones) → aprobar / rechazar (justificación opcional)
  - Aprobada → bloquear las otras 2 propuestas, deshabilitar "Crear/Mandar propuesta", habilitar "Ver plan de trabajo"
  - Rechazada → propuesta completa bloqueada, botón "Crear nueva propuesta"

### ✅ Pruebas F6 (cierra el loop)

- [ ] Egresado manda → admin aprueba → egresado ve estado y botones correctos
- [ ] Rechazos con y sin justificación le llegan al egresado
- [ ] Decanato puede aprobar; asesor/egresado NO ven las colas

---

## FASE 7 — Asesor + Plan de trabajo

(Spec mínima; ampliar cuando la universidad responda la pregunta 0.3.2)
- Asesor ve las propuestas aprobadas asignadas a él
- Genera el plan de trabajo a partir de las actividades de la propuesta (puede ajustar/reordenar)
- Egresado: "Ver plan de trabajo" en solo lectura

### ✅ Pruebas F7

- [ ] Egresado con propuesta aprobada ve el plan que publicó su asesor
- [ ] Asesor no ve propuestas de otros asesores

---

## FASE 8 — Pendientes de spec (NO arrancar sin cerrar 0.3)

- Propuesta tipo **Proyecto** (el manual se corta a media sección)
- **Informes mensuales** (la fecha ya vive en `periodos`; falta formato y flujo de entrega)
- Notificaciones in-app/correo (la tabla ya existe desde F1)
- Export PDF de la propuesta (nice-to-have)

---

## Cómo trabajar esto en Antigravity

1. **Carpeta `specs/` en el repo:** este PLAN.md + el manual original + un .md corto por sub-fase compleja (5.2, 5.3, 5.4). El agente lee la spec antes de tocar código.
2. **1 tarea = 1 sub-fase.** Prompt tipo:
   > "Implementa la sub-fase 5.2 según specs/PLAN.md. Al terminar: corre `npm run test` y `npm run test:e2e`, verifica en el navegador con egresado@uni.test / Test123!, y entrega walkthrough con screenshots."
3. **Revisar el plan de implementación del agente ANTES de dejarlo ejecutar** (Antigravity lo genera como artifact). Ahí se cazan las malinterpretaciones baratas.
4. **Exigir evidencia:** tests verdes + grabación/screenshot del flujo en browser. Sin evidencia no hay merge.
5. **`db:reset` entre pruebas** para que el agente pueda repetir flujos desde cero cuantas veces quiera.
6. Si la spec cambia → primero se actualiza el .md, después se pide el cambio de código.

## Credenciales seed (documentar también en TESTING.md)

| Rol | Correo | Password |
|---|---|---|
| Admin | admin@uni.test | Test123! |
| Decanato | decanato@uni.test | Test123! |
| Asesor | asesor@uni.test | Test123! |
| Egresado | egresado@uni.test | Test123! |

---

**Definición de "funcional" para v1:** un egresado puede subir sus 3 documentos, armar una propuesta de pasantía con empresa nueva y mandarla; admin/decanato la aprueba; el asesor publica el plan de trabajo; el egresado lo ve. Ese flujo completo en Playwright es el examen final del sistema.
