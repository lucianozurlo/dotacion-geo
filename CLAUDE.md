# CLAUDE.md

Contexto del proyecto para Claude Code. Leer antes de tocar código.

## Qué es esto

Dashboard analítico client-side para explorar la dispersión geográfica y la evolución temporal de la dotación fusionada de **Personal + TMA** (telecom argentina, contexto post-fusión). Cobertura: Argentina (foco), Uruguay, Chile, Paraguay.

React 19 + TypeScript estricto + Vite 8. Sin backend, sin API keys, sin servicios pagos.

## Comandos

```bash
npm run dev        # dev server :5173
npm run build      # tsc -b && vite build
npm test           # vitest run — 36 tests, 4 suites
npm run typecheck  # sólo tipos
npm run lint       # oxlint
```

Después de cualquier cambio: `npm run typecheck && npm test`. El build debe quedar sin warnings.

## Arquitectura

```
src/domain/     lógica pura, CERO imports de React. Testeable en aislamiento.
src/state/      store (useDataset) + serialización de filtros a URL hash
src/workers/    generación y parsing fuera del hilo principal
src/components/ presentación
```

La separación `domain/` ↔ `components/` es deliberada. Lógica de negocio nueva va en `domain/`, no en un componente.

## Invariantes — no romper

1. **Las 44 columnas originales conservan sus nombres literales.** Están en `ORIGINAL_COLUMNS` (`src/domain/types.ts`), en orden, con acentos y paréntesis tal cual vienen del extract SAP (`DepN1 (Código)`, `Función Título del puesto`, etc.). No renombrar, no normalizar a snake_case.

2. **Todo campo geográfico es derivado y lleva prefijo `_geo`.** El origen no trae geolocalización: se sintetiza. La distinción tiene que quedar visible en la UI y en los exports.

3. **Nunca existe `_geo_precision: 'exact'`.** Las coordenadas son jitter alrededor de centroides urbanos públicos. No representan domicilios. Si alguien pide "coordenadas reales de empleados", eso no se implementa.

4. **Los empleados son sintéticos.** Nombres, apellidos, legajos, supervisores: todos ficticios, generados desde catálogos en `src/domain/catalogs.ts`. Nunca copiar identidades del CSV de ejemplo.

5. **El snapshot 2026-07-21 tiene totales exactos:** Personal 17.768, TMA 8.711, Personal Paraguay 1.200. Hay un test que lo asserta. Si cambiás el generador y esto se rompe, es un bug, no un test desactualizado.

6. **Los registros no ubicables se marcan `sin_geolocalizar`, jamás se inventa una ubicación en silencio.** La cascada de geolocalización tiene 4 niveles y un fallback explícito.

7. **Snapshots inmutables.** Se agregan, no se mutan. Id = `${fechaISO}|${empresa}`.

## Modelo de datos

```ts
Employee = (44 columnas originales) & DerivedGeo & {
  _snapshotId: string   // "2026-07-21|Personal"
  _empresa: Empresa     // 'Personal' | 'TMA' | 'Personal Paraguay'
  _key: string          // `${empresa}:${legajo}`
}

DerivedGeo = {
  _geo_region, _geo_subdivision, _geo_localidad: string
  _geo_lat, _geo_lon: number | null      // null si no ubicable
  _geo_precision: 'centroid_jitter' | 'subdivision_centroid' | 'sin_geolocalizar'
  _geo_source: 'sintetico' | 'localidad_lookup' | 'sociedad_lookup' | 'ninguna'
}
```

Snapshots por defecto: 31/05/2026, 30/06/2026, 21/07/2026 × 3 empresas = 9. Generados en runtime, no versionados.

**Identidad entre snapshots: el `Legajo`, no `_key`.** La comparación usa legajo justamente para poder detectar cambios de empresa. Si comparás por `_key`, los cambios de empresa se ven como alta + baja.

## Filtros

**AND entre dimensiones, OR dentro de cada dimensión.** Esto es requisito funcional, no detalle de implementación.

Los niveles DepN1–DepN9 son dependientes: cada nivel sólo ofrece valores compatibles con la selección de los niveles superiores, y al cambiar un nivel se limpian los inferiores. Nunca ofrecer combinaciones imposibles.

Para agregar una dimensión de filtro, tocar en este orden:
1. `FilterState` en `src/domain/filters.ts`
2. getter + rama en `matches()`
3. `optionsFor` / sección en `FiltersPanel.tsx`
4. chip removible
5. serialización en `src/state/urlState.ts` (`ARRAY_KEYS`)
6. test en `src/test/filters.test.ts`

Saltarse el paso 5 rompe silenciosamente la persistencia en URL.

## Rendimiento — restricciones reales

Snapshot vigente = **27.679 filas**. Medido:

| Operación | Tiempo |
|---|---|
| Generación 9 snapshots | 2.138 ms (en worker) |
| Filtro completo | ~7 ms |
| Comparación de snapshots | 42 ms |

**No renderizar un nodo React por empleado.** El clustering es nativo de MapLibre (GPU) vía `cluster: true` en la fuente GeoJSON. La tabla de detalle está virtualizada a mano (ventana visible + overscan). Cualquier cambio que introduzca 27k nodos en el DOM es una regresión.

Generación y parsing van en Web Worker (`src/workers/dataWorker.ts`) para no bloquear la UI.

## Mapa

MapLibre GL, basemap raster OSM, límites Natural Earth vía CDN. Sin API key.

Capas: clusters, puntos, heatmap, límites de países, provincias/regiones — todas conmutables.

En tests, MapLibre está mockeado (`src/test/dashboard.test.tsx`): jsdom no tiene WebGL. Si agregás API de mapa que el smoke test toque, ampliá el mock.

## Accesibilidad

No es opcional en este proyecto: navegación por teclado completa, skip link al mapa, `aria-expanded` / `aria-pressed` / `aria-live`, labels en todos los controles, foco visible, tooltips que no dependen de hover, `prefers-reduced-motion` respetado. Mantener al agregar UI.

## Estilo de código

- TypeScript `strict`. Nada de `any`; si hace falta un escape, `unknown` + narrowing.
- Sin librerías nuevas salvo necesidad real — el bundle ya pesa 357 kB gzip por MapLibre.
- Comentarios sólo donde el *por qué* no se deduce del código.
- Español rioplatense en UI y comentarios; inglés en identificadores.
- Números formateados con `es-AR` (`fmtNum`), porcentajes con coma decimal (`pct`).

## Limitaciones conocidas

1. Catálogo geográfico: 63 centros urbanos. Fuera de eso → subdivisión o `sin_geolocalizar`. Ampliar = agregar filas a `LOCALIDADES`.
2. Filtro de líderes: top 60 por reportes, para no volcar miles de opciones al DOM.
3. IndexedDB no disponible en incógnito de algunos navegadores → sólo sintéticos, sin persistencia.
4. Bundle > 1 MB sin comprimir, dominado por MapLibre. Candidato a `React.lazy`.
5. Comparación de a dos fechas. No hay series temporales de más de dos puntos.
6. **El mapa nunca fue validado visualmente**: se construyó en un entorno sin WebGL. Todo lo demás está cubierto por tests.

## Al terminar una tarea

1. `npm run typecheck` — sin salida
2. `npm test` — 36/36 (o más, si agregaste)
3. `npm run build` — sin warnings
4. Si tocaste el modelo de datos, la importación o los supuestos: actualizar `README.md`
