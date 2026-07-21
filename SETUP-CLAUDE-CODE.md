# Puesta en marcha desde Claude Code

Guía operativa para levantar `dotacion-geo` en tu máquina y seguir trabajando con Claude Code.

---

## 0. Requisitos previos

| Requisito | Versión | Verificar |
|---|---|---|
| Node.js | >= 20.19 (ideal 22.x) | `node -v` |
| npm | >= 10 | `npm -v` |
| Claude Code | cualquiera | `claude --version` |

Si no tenés Node 22, en Windows/macOS/Linux lo más simple es [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

---

## 1. Descomprimir

Descargá `dotacion-geo.zip` y descomprimilo donde guardes tus proyectos.

**macOS / Linux**
```bash
cd ~/proyectos
unzip ~/Downloads/dotacion-geo.zip
cd dotacion-geo
```

**Windows (PowerShell)**
```powershell
cd $HOME\proyectos
Expand-Archive -Path "$HOME\Downloads\dotacion-geo.zip" -DestinationPath .
cd dotacion-geo
```

### Verificá que estén los archivos ocultos

El zip incluye dos dotfiles que el explorador de archivos **no muestra por defecto**. Confirmá que están:

```bash
ls -a          # macOS / Linux
dir /a         # Windows CMD
Get-ChildItem -Force   # PowerShell
```

Deberías ver `.gitignore` y `.oxlintrc.json`. Conteo esperado: **35 archivos**.

```bash
# macOS / Linux
find . -type f | wc -l     # -> 35
```

Si te da 33, el descompresor se comió los ocultos: volvé a extraer con `unzip` desde terminal en vez de doble click.

---

## 2. Instalar dependencias

```bash
npm install
```

Esperado: `found 0 vulnerabilities`. Tarda ~1-2 min la primera vez (MapLibre es pesado).

---

## 3. Levantar

```bash
npm run dev
```

Abrí **http://localhost:5173**. Al cargar, un Web Worker genera los 9 snapshots (~2 s) y el dashboard queda operativo.

> Verás el mapa completo recién acá: el entorno donde se construyó no tiene WebGL, así que **esta es la primera validación visual real** del clustering con 27.679 registros. Es el único criterio de aceptación que quedó sin evidencia directa.

---

## 4. Verificar que todo está sano

```bash
npm run typecheck   # tsc estricto, sin salida = OK
npm test            # 36 tests en 4 suites
npm run build       # build de producción, 0 warnings
```

Resultados esperados:

| Comando | Esperado |
|---|---|
| `npm run typecheck` | sin salida |
| `npm test` | `Tests 36 passed (36)` |
| `npm run build` | `✓ built in ~1.4s`, sin warnings |

---

## 5. Abrir en Claude Code

```bash
cd dotacion-geo
claude
```

El proyecto incluye un `CLAUDE.md` en la raíz: Claude Code lo lee automáticamente y arranca con el contexto del modelo de datos, las reglas de negocio y las invariantes que no se pueden romper. No necesitás explicarle el proyecto.

### Primer prompt sugerido

```
Leé CLAUDE.md y README.md. Después corré `npm test` y `npm run build`
para confirmar el estado base. No cambies nada todavía: decime qué encontrás.
```

---

## 6. Inicializar git (recomendado antes de tocar nada)

```bash
git init
git add -A
git commit -m "chore: baseline dotacion-geo (36 tests verdes, build limpio)"
```

Así cualquier cambio que haga Claude Code queda diffeable y revertible con `git diff` / `git checkout .`.

---

## 7. Qué hacer primero

Orden sugerido, de menor a mayor riesgo:

1. **Validar visualmente el mapa.** Filtrá por empresa, prendé el heatmap, hacé click en un cluster y en un punto. Es lo único no verificado automáticamente.
2. **Probar el flujo de importación.** Botón *Importar snapshot* → subí el CSV real de una fecha nueva. Fijate el preview y descargá el CSV de errores si aparece alguno.
3. **Ajustar el catálogo geográfico.** Si tu dotación real tiene localidades fuera de las 63 cargadas, agregalas en `src/domain/geoCatalog.ts` (array `LOCALIDADES`) y mapeá sociedades en `SOCIEDAD_ZONA`.
4. **Recién después**, cambios de fondo (nuevas dimensiones, series temporales de más de dos puntos, etc.).

### Prompts útiles para Claude Code

```
Agregá estas localidades al catálogo LOCALIDADES en src/domain/geoCatalog.ts:
[pegá acá: nombre, provincia, lat, lon]. Respetá el formato existente,
actualizá los tests si hace falta y corré `npm test` al terminar.
```

```
El bundle pesa 357 kB gzip por MapLibre. Pasá el mapa a carga diferida
con React.lazy + Suspense sin romper los tests del dashboard.
```

```
Agregá una dimensión de filtro por [X]. Seguí el patrón de las existentes
en src/domain/filters.ts: tipo en FilterState, getter, matches(), chip,
serialización en urlState.ts, y un test en src/test/filters.test.ts.
```

---

## Estructura de referencia

```
dotacion-geo/
├── .gitignore            (oculto)
├── .oxlintrc.json        (oculto)
├── CLAUDE.md             ← contexto para Claude Code
├── README.md             ← modelo de datos, importación, supuestos
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig*.json        (3 archivos)
└── src/
    ├── App.tsx, main.tsx
    ├── components/       (6 archivos)
    ├── domain/           (8 archivos — lógica pura, sin React)
    ├── data/orgStructure.json  (1.740 rutas DepN reales)
    ├── state/            (2 archivos)
    ├── styles/app.css
    ├── test/             (5 archivos)
    └── workers/dataWorker.ts
```

---

## Problemas frecuentes

**El mapa se ve gris / no carga el fondo**
El basemap viene de tile.openstreetmap.org. Si estás detrás del proxy corporativo, puede estar bloqueado. Los datos, filtros, KPIs y comparaciones siguen funcionando igual; sólo se degrada el fondo cartográfico. Para un basemap interno, cambiá la constante `STYLE` en `src/components/MapView.tsx`.

**`npm install` falla con EIO o rename**
Estás sobre una unidad de red o carpeta sincronizada (OneDrive/Dropbox). Movelo a un path local.

**Puerto 5173 ocupado**
```bash
npm run dev -- --port 5180
```

**Los tests tardan ~17 s**
Es esperado: `generator.test.ts` genera datasets completos tres veces para verificar determinismo.

**No veo `.gitignore` en el explorador**
Es correcto, está oculto. En macOS: `Cmd+Shift+.` en Finder. En Windows: Vista → Elementos ocultos.
