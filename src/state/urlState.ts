import { DEP_LEVELS, emptyFilters, type FilterState } from '../domain/filters';
import { LATEST_DATE, type Empresa } from '../domain/types';

const ARRAY_KEYS = [
  'empresas', 'paises', 'subdivisiones', 'localidades', 'generos', 'sociedades',
  'familias', 'grupos', 'areas', 'especialidades', 'titulos', 'lideres',
] as const;

/** Codifica el estado de filtros en el hash de la URL (compartible/bookmarkeable). */
export function encodeFilters(f: FilterState): string {
  const p = new URLSearchParams();
  p.set('d', f.fecha);
  if (f.fechaComparacion) p.set('c', f.fechaComparacion);
  for (const k of ARRAY_KEYS) {
    const v = f[k] as string[];
    if (v.length) p.set(k, v.join('~'));
  }
  for (const lvl of DEP_LEVELS) {
    const v = f.dep[lvl];
    if (v && v.length) p.set(`dep${lvl}`, v.join('~'));
  }
  if (f.q.trim()) p.set('q', f.q.trim());
  if (!f.incluirSinGeo) p.set('nogeo', '0');
  return `#${p.toString()}`;
}

export function decodeFilters(hash: string): FilterState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const p = new URLSearchParams(raw);
    const f = emptyFilters(p.get('d') || LATEST_DATE);
    f.fechaComparacion = p.get('c');
    for (const k of ARRAY_KEYS) {
      const v = p.get(k);
      if (v) (f[k] as string[]) = v.split('~').filter(Boolean);
    }
    f.empresas = f.empresas as Empresa[];
    for (const lvl of DEP_LEVELS) {
      const v = p.get(`dep${lvl}`);
      if (v) f.dep[lvl] = v.split('~').filter(Boolean);
    }
    f.q = p.get('q') ?? '';
    f.incluirSinGeo = p.get('nogeo') !== '0';
    return f;
  } catch {
    return null;
  }
}
