# Dotación Geo — Personal + TMA

Dashboard analítico para explorar la **dispersión geográfica** y la **evolución temporal** de la dotación fusionada de Personal y TMA (contexto post-fusión), con cobertura en Argentina, Uruguay, Chile y Paraguay.

Aplicación 100% client-side: no requiere backend, claves privadas, servicios pagos ni geocodificación en línea.

> **Todos los empleados son sintéticos.** No hay información personal real en el repositorio ni en runtime. Las coordenadas se generan con jitter controlado alrededor de centroides urbanos públicos y **no representan domicilios**.

---

## Requisitos

- Node.js >= 20.19 (probado en 22.x)
- npm >= 10

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Typecheck (`tsc -b`) + build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm test` | Suite de tests (Vitest) |
| `npm run typecheck` | Sólo verificación de tipos |
| `npm run lint` | Lint con oxlint |

No hay pasos de configuración adicionales: al abrir la app, los datos sintéticos se generan en un Web Worker y el dashboard queda operativo.

---

## Modelo de datos

### Snapshots inmutables

La unidad de datos es el **snapshot**: una foto de la dotación de *una empresa* en *una fecha*. Los snapshots no se mutan; se agregan.

```
id      = `${fechaISO}|${empresa}`     // ej. "2026-07-21|Personal"
fecha   = ISO yyyy-mm-dd
empresa = 'Personal' | 'TMA' | 'Personal Paraguay'
origen  = 'sintetico' | 'importado'
total   = cantidad de filas
```

Snapshots incluidos por defecto (generados, no versionados):

| Fecha | Personal | TMA | Personal Paraguay |
|---|---|---|---|
| 31/05/2026 | 17.785 | 8.720 | 1.200 |
| 30/06/2026 | 17.714 | 8.685 | 1.196 |
| **21/07/2026** (vigente) | **17.768** | **8.711** | **1.200** |

El snapshot vigente tiene totales **exactos** por diseño; los anteriores difieren por altas y bajas plausibles, con legajos persistentes entre períodos (>90% de solapamiento).

### Columnas

Cada registro conserva **las 44 columnas originales del extract con sus nombres literales** (`Legajo`, `Nombre`, `Apellidos`, `Género`, `DepN1 (Código)` … `DepN9 (Label)`, `Función Título del puesto`, `Familia de función`, `Grupo de personal`, `Area de Actividad`, `Especialidad`, jerarquía de supervisores, `País`, `Sociedad`, etc.). Están declaradas en `src/domain/types.ts` como `ORIGINAL_COLUMNS`, en orden.

Los campos geográficos **no existen en el origen**: son derivados y llevan prefijo `_geo` para que la distinción sea inequívoca.

| Campo derivado | Descripción |
|---|---|
| `_geo_region` | Macro-región (AMBA, NOA, Litoral, Patagonia…) |
| `_geo_subdivision` | Provincia / región / departamento |
| `_geo_localidad` | Localidad o centro urbano |
| `_geo_lat` / `_geo_lon` | Coordenadas (`null` si no se pudo ubicar) |
| `_geo_precision` | `centroid_jitter` · `subdivision_centroid` · `sin_geolocalizar` |
| `_geo_source` | `sintetico` · `localidad_lookup` · `sociedad_lookup` · `ninguna` |

Metadatos de runtime: `_snapshotId`, `_empresa`, `_key`.

> **No existe la precisión `exact`.** Nunca se emiten coordenadas de vivienda.

---

## Datos sintéticos

El generador (`src/domain/generator.ts`) es **determinístico**: la misma seed produce byte a byte el mismo dataset. La seed por defecto es `20260721`.

- Estructuras organizativas tomadas de las **1.740 rutas jerárquicas reales** extraídas de `personal-estructura.csv` (`src/data/orgStructure.json`), respetando la jerarquía DepN1→DepN9 sin saltos de nivel.
- Nombres, apellidos, legajos, IDs y supervisores son ficticios (`src/domain/catalogs.ts`).
- Distribución concentrada en 63 centros urbanos plausibles, ponderada por peso demográfico/operativo (`src/domain/geoCatalog.ts`).
- Jitter gaussiano acotado a ±3σ alrededor del centroide, corregido por latitud en el eje longitudinal.
- Se inyectan deliberadamente **casos incompletos** (~1,2%: niveles DepN profundos y área/especialidad vacíos) y **registros sin geolocalizar** (~1,7%) para validar el manejo de calidad de datos.

No hay CSV masivo versionado: el dataset se genera al iniciar. Los tests usan muestras pequeñas construidas en memoria.

Para cambiar la seed, editar `DEFAULT_SEED` en `src/domain/generator.ts`.

---

## Importar un snapshot nuevo

Botón **Importar snapshot** en el header. No requiere tocar código.

1. Elegir **empresa** y **fecha** (acepta `dd/mm/aaaa` o ISO).
2. Seleccionar el CSV — separador `;`. Encoding UTF-8, con fallback automático a Windows-1252 si se detectan bytes inválidos.
3. **Validación**: encabezado completo (las 44 columnas), legajos presentes y bien formados, duplicados, fechas y filas inválidas.
4. **Preview**: conteo de filas válidas / rechazadas / duplicadas / sin geolocalizar, más las 5 primeras filas normalizadas. Los errores se descargan como CSV.
5. **Confirmar** incorpora el snapshot y lo persiste en IndexedDB.

Si el encabezado está incompleto, la importación se bloquea y no se incorpora nada.

### Cascada de geolocalización

Se aplica en orden, y **nunca inventa una ubicación en silencio**:

1. `_geo_lat` / `_geo_lon` presentes y válidos en el CSV → se usan tal cual.
2. `_geo_localidad` reconocida en el catálogo → centroide + jitter determinístico por legajo.
3. `_geo_subdivision` reconocida → centroide de subdivisión (`subdivision_centroid`).
4. Tabla configurable **sociedad → zona** (`SOCIEDAD_ZONA` en `src/domain/geoCatalog.ts`).
5. Sin coincidencias → `sin_geolocalizar`, `lat`/`lon` en `null`, contabilizado y visible en el panel de calidad de datos.

Los snapshots importados se pueden **exportar** (JSON) o **borrar** individualmente, y hay opción de borrado total. Los snapshots sintéticos no se persisten ni se borran: se regeneran en cada carga.

---

## Filtros

Lógica **AND entre dimensiones, OR dentro de cada dimensión**.

Dimensiones: fecha/snapshot y rango comparativo · empresa · país · provincia/región · localidad · género · sociedad · familia de función · grupo de personal · área de actividad · especialidad · título de puesto · **DepN1–DepN9 con dependencia jerárquica** · líder/supervisor · búsqueda libre por nombre, apellido o legajo.

- Multiselección con conteo por opción y chips de filtros activos removibles individualmente.
- **Limpiar todo** en un click.
- Los niveles DepN sólo ofrecen valores compatibles con lo seleccionado en niveles superiores; al cambiar un nivel se limpian los inferiores. No se ofrecen combinaciones imposibles.
- Estado persistido en el **hash de la URL** (compartible y bookmarkeable).
- Los KPIs de empresa y participación femenina, y las barras de país/área/género en el panel de insights, funcionan como filtros: un click aplica o quita el segmento.

---

## Mapa

MapLibre GL con basemap raster OpenStreetMap y límites administrativos Natural Earth. Sin API key.

- Encuadre inicial sobre el cono sur con Argentina predominante.
- Capas conmutables: **clusters**, **puntos**, **heatmap**, **límites de países**, **provincias/regiones**.
- Clustering nativo de MapLibre (GPU): con 27.679 registros no se renderiza ningún nodo React por empleado.
- Click en cluster → zoom y desagregación. Click en punto → ficha del empleado sintético, con aviso explícito de que la ubicación es aproximada.
- Ajustar a resultados, reset de vista, zoom, leyenda con conteo de registros no ubicables.

---

## Analítica

**KPIs**: dotación visible, participación por empresa, países activos, distribución de género, variación contra el snapshot previo (absoluta y porcentual, siempre con la base explicitada).

**Comparación entre snapshots**: altas, bajas, permanencias, cambios de empresa, cambios de región y cambios organizativos. La comparación aplica los mismos filtros a ambos períodos, y el panel indica la base sobre la que se calcula para evitar métricas engañosas.

---

## Calidad técnica

- TypeScript en modo `strict`, componentes desacoplados; parser, normalización, geolocalización y filtros aislados en módulos reutilizables.
- Generación y parsing en **Web Worker** — la UI no se bloquea.
- Tabla de detalle **virtualizada** (sólo renderiza la ventana visible + overscan).
- Responsive desktop / tablet / móvil; paneles laterales colapsables.
- Accesibilidad: navegación por teclado, skip link al mapa, `aria-expanded` / `aria-pressed` / `aria-live`, labels en todos los controles, foco visible, tooltips no dependientes de hover, `prefers-reduced-motion` respetado.
- Estados de carga, vacío, error e importación exitosa.

### Rendimiento medido

Snapshot vigente, 27.679 registros (Node 22, contenedor sin aceleración):

| Operación | Tiempo |
|---|---|
| Generación de 9 snapshots (3 fechas × 3 empresas) | 2.138 ms (en worker, no bloquea la UI) |
| Filtro completo sobre 27.679 filas | ~7 ms (140 ms / 20 pasadas) |
| Filtro compuesto (empresa + género + país) → 6.672 filas | 22 ms |
| Comparación entre dos snapshots | 42 ms |

### Tests

```
npm test
# 4 archivos · 36 tests · todos en verde
```

| Suite | Cobertura |
|---|---|
| `parser.test.ts` | Normalización de fechas, encabezado incompleto, duplicados, legajo vacío, las 4 ramas de la cascada de geolocalización |
| `filters.test.ts` | AND/OR, búsqueda libre, sin-geo, dependencia DepN, altas/bajas/permanencias, cambios de empresa/región/organización |
| `generator.test.ts` | Totales exactos, determinismo por seed, unicidad y persistencia de legajos, casos sin geolocalizar, cobertura de los 4 países, coordenadas dentro del cono sur, jerarquía DepN sin saltos |
| `dashboard.test.tsx` | Smoke: header, fecha de última dotación, KPIs, paneles accesibles, skip link |

---

## Estructura del proyecto

```
src/
├── domain/            # lógica pura, sin React
│   ├── types.ts       # 44 columnas originales, derivados, snapshots
│   ├── catalogs.ts    # nombres ficticios, sociedades, valores funcionales
│   ├── geoCatalog.ts  # centroides urbanos, tabla sociedad → zona
│   ├── rng.ts         # PRNG determinístico
│   ├── generator.ts   # generación de snapshots sintéticos
│   ├── parser.ts      # parsing, validación y geolocalización de CSV
│   ├── filters.ts     # motor de filtros y comparación de snapshots
│   └── storage.ts     # persistencia IndexedDB
├── data/
│   └── orgStructure.json   # 1.740 rutas DepN1–DepN9 reales
├── state/
│   ├── useDataset.ts  # store principal
│   └── urlState.ts    # serialización de filtros a URL
├── workers/
│   └── dataWorker.ts  # generación y parsing fuera del hilo principal
├── components/        # MapView, FiltersPanel, InsightsPanel, KpiBar,
│                      # ResultsTable, ImportModal
├── styles/app.css
└── test/
```

---

## Supuestos y limitaciones

**Supuestos**

1. País y sociedad no permiten ubicar a una persona individualmente. La geografía se sintetiza de forma coherente con la sociedad y el país, y se declara como derivada.
2. El basemap y los límites administrativos se sirven desde CDNs públicos (OSM, Natural Earth). Sin conexión, la app funciona: los datos, filtros, KPIs y comparaciones siguen operativos y sólo se degrada el fondo cartográfico.
3. Los snapshots sintéticos viven en memoria y se regeneran en cada carga; sólo los importados se persisten.
4. Los legajos son la clave de identidad entre snapshots. El cambio de empresa se detecta comparando por legajo, no por `_key`.

**Limitaciones conocidas**

1. El catálogo geográfico cubre 63 centros urbanos. Una localidad fuera del catálogo cae a subdivisión o a `sin_geolocalizar`; ampliarlo es agregar filas a `LOCALIDADES`.
2. El filtro de líderes muestra los 60 con más reportes en el resultado actual (más los ya seleccionados), para no volcar miles de opciones al DOM.
3. IndexedDB no está disponible en modo incógnito de algunos navegadores; en ese caso la app funciona sólo con snapshots sintéticos y la importación no persiste entre sesiones.
4. El bundle principal supera 1 MB sin comprimir (357 kB gzip), dominado por MapLibre. Es aceptable para una herramienta interna; si hiciera falta, se puede pasar a carga diferida del mapa.
5. La comparación entre snapshots es de a dos fechas. No hay series temporales de más de dos puntos.
