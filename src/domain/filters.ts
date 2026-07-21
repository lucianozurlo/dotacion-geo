import type { Employee, Empresa } from './types';

export const DEP_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface FilterState {
  fecha: string;
  fechaComparacion: string | null;
  empresas: Empresa[];
  paises: string[];
  subdivisiones: string[];
  localidades: string[];
  generos: string[];
  sociedades: string[];
  familias: string[];
  grupos: string[];
  areas: string[];
  especialidades: string[];
  titulos: string[];
  /** DepN1..DepN9 -> labels seleccionados */
  dep: Record<number, string[]>;
  lideres: string[];
  /** búsqueda libre por nombre, apellido o legajo */
  q: string;
  /** false = ocultar los `sin_geolocalizar` del mapa/lista */
  incluirSinGeo: boolean;
}

export function emptyFilters(fecha: string): FilterState {
  return {
    fecha,
    fechaComparacion: null,
    empresas: [],
    paises: [],
    subdivisiones: [],
    localidades: [],
    generos: [],
    sociedades: [],
    familias: [],
    grupos: [],
    areas: [],
    especialidades: [],
    titulos: [],
    dep: {},
    lideres: [],
    q: '',
    incluirSinGeo: true,
  };
}

export function countActiveFilters(f: FilterState): number {
  let n = 0;
  const arrays: (keyof FilterState)[] = [
    'empresas', 'paises', 'subdivisiones', 'localidades', 'generos', 'sociedades',
    'familias', 'grupos', 'areas', 'especialidades', 'titulos', 'lideres',
  ];
  for (const k of arrays) n += (f[k] as string[]).length;
  for (const lvl of DEP_LEVELS) n += (f.dep[lvl] ?? []).length;
  if (f.q.trim()) n += 1;
  if (!f.incluirSinGeo) n += 1;
  return n;
}

export function depLabel(e: Employee, lvl: number): string {
  return (e as unknown as Record<string, string>)[`DepN${lvl} (Label)`] ?? '';
}

export function liderNombre(e: Employee): string {
  const n = `${e['Líder Nombre']} ${e['Líder Apellidos']}`.trim();
  return n || '(sin líder)';
}

export function paisNombre(e: Employee): string {
  // "ARG/01-Argentina" -> "Argentina"
  const p = e['País'] ?? '';
  const i = p.indexOf('-');
  return i >= 0 ? p.slice(i + 1) : p || '(sin país)';
}

/** AND entre dimensiones, OR dentro de cada dimensión. */
export function matches(e: Employee, f: FilterState): boolean {
  if (f.empresas.length && !f.empresas.includes(e._empresa)) return false;
  if (f.paises.length && !f.paises.includes(paisNombre(e))) return false;
  if (f.subdivisiones.length && !f.subdivisiones.includes(e._geo_subdivision)) return false;
  if (f.localidades.length && !f.localidades.includes(e._geo_localidad)) return false;
  if (f.generos.length && !f.generos.includes(e['Género'])) return false;
  if (f.sociedades.length && !f.sociedades.includes(e.Sociedad)) return false;
  if (f.familias.length && !f.familias.includes(e['Familia de función'])) return false;
  if (f.grupos.length && !f.grupos.includes(e['Grupo de personal'])) return false;
  if (f.areas.length && !f.areas.includes(e['Area de Actividad'])) return false;
  if (f.especialidades.length && !f.especialidades.includes(e.Especialidad)) return false;
  if (f.titulos.length && !f.titulos.includes(e['Título de Puesto'])) return false;
  if (f.lideres.length && !f.lideres.includes(liderNombre(e))) return false;
  if (!f.incluirSinGeo && e._geo_precision === 'sin_geolocalizar') return false;

  for (const lvl of DEP_LEVELS) {
    const sel = f.dep[lvl];
    if (sel && sel.length && !sel.includes(depLabel(e, lvl))) return false;
  }

  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay =
      e.Legajo.toLowerCase().includes(q) ||
      e.Nombre.toLowerCase().includes(q) ||
      e.Apellidos.toLowerCase().includes(q) ||
      `${e.Nombre} ${e.Apellidos}`.toLowerCase().includes(q);
    if (!hay) return false;
  }
  return true;
}

export function applyFilters(rows: Employee[], f: FilterState): Employee[] {
  const out: Employee[] = [];
  for (let i = 0; i < rows.length; i++) if (matches(rows[i], f)) out.push(rows[i]);
  return out;
}

/** Conteo por valor de una dimensión, sobre el set ya filtrado. */
export function countBy(rows: Employee[], get: (e: Employee) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = get(r) || '(sin dato)';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function sortedCounts(m: Map<string, number>, limit?: number) {
  const arr = [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return limit ? arr.slice(0, limit) : arr;
}

/**
 * Opciones dependientes para DepN{lvl}: sólo devuelve labels que existen
 * dado lo ya seleccionado en los niveles superiores. Evita combinaciones imposibles.
 */
export function dependentDepOptions(
  rows: Employee[],
  f: FilterState,
  lvl: number,
): { value: string; count: number }[] {
  const m = new Map<string, number>();
  outer: for (const e of rows) {
    for (let up = 1; up < lvl; up++) {
      const sel = f.dep[up];
      if (sel && sel.length && !sel.includes(depLabel(e, up))) continue outer;
    }
    const v = depLabel(e, lvl);
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'es'));
}

export function optionsWithCounts(
  rows: Employee[],
  get: (e: Employee) => string,
): { value: string; count: number }[] {
  const m = countBy(rows, get);
  return [...m.entries()]
    .filter(([v]) => v !== '(sin dato)')
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'es'));
}

// ---------------- comparación de snapshots ----------------

export interface Movimientos {
  altas: Employee[];
  bajas: Employee[];
  permanencias: number;
  cambioEmpresa: Employee[];
  cambioRegion: Employee[];
  cambioOrganizativo: Employee[];
}

/** Compara dos conjuntos por legajo (no por `_key`, para detectar cambio de empresa). */
export function compareSnapshots(actual: Employee[], previo: Employee[]): Movimientos {
  const prevByLegajo = new Map<string, Employee>();
  for (const p of previo) prevByLegajo.set(p.Legajo, p);
  const actByLegajo = new Map<string, Employee>();
  for (const a of actual) actByLegajo.set(a.Legajo, a);

  const altas: Employee[] = [];
  const bajas: Employee[] = [];
  const cambioEmpresa: Employee[] = [];
  const cambioRegion: Employee[] = [];
  const cambioOrganizativo: Employee[] = [];
  let permanencias = 0;

  for (const a of actual) {
    const p = prevByLegajo.get(a.Legajo);
    if (!p) {
      altas.push(a);
      continue;
    }
    permanencias++;
    if (p._empresa !== a._empresa) cambioEmpresa.push(a);
    if (p._geo_region !== a._geo_region || p._geo_subdivision !== a._geo_subdivision) {
      cambioRegion.push(a);
    }
    if (p['Unidad Organizativa Código'] !== a['Unidad Organizativa Código']) {
      cambioOrganizativo.push(a);
    }
  }
  for (const p of previo) if (!actByLegajo.has(p.Legajo)) bajas.push(p);

  return { altas, bajas, permanencias, cambioEmpresa, cambioRegion, cambioOrganizativo };
}

export function pct(part: number, total: number): string {
  if (!total) return '0,0%';
  return `${((part / total) * 100).toFixed(1).replace('.', ',')}%`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString('es-AR');
}
