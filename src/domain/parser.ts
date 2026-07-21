import Papa from 'papaparse';
import { ORIGINAL_COLUMNS, snapshotId, type Empresa, type Employee } from './types';
import { lookupLocalidad, lookupSociedadZona, lookupSubdivision } from './geoCatalog';
import { hashSeed, mulberry32 } from './rng';

export interface RowError {
  fila: number;
  legajo: string;
  campo: string;
  motivo: string;
}

export interface ParseResult {
  rows: Employee[];
  errors: RowError[];
  headerMissing: string[];
  headerExtra: string[];
  duplicados: number;
  totalFilas: number;
  sinGeolocalizar: number;
}

/** Acepta dd/mm/yyyy, yyyy-mm-dd o dd-mm-yyyy. Devuelve ISO o null. */
export function normalizeFecha(input: string): string | null {
  const s = (input || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return isValidYMD(+m[1], +m[2], +m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) {
    const d = +m[1];
    const mo = +m[2];
    const y = +m[3];
    return isValidYMD(y, mo, d)
      ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      : null;
  }
  return null;
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2200) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Quita BOM y normaliza espacios del encabezado. */
function cleanHeader(h: string): string {
  return h.replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
}

export interface ParseOptions {
  empresa: Empresa;
  fecha: string; // ISO
  /** columnas geográficas opcionales que el CSV puede traer ya agregadas */
  colLocalidad?: string;
  colSubdivision?: string;
  colLat?: string;
  colLon?: string;
}

export function parseCsv(text: string, opts: ParseOptions): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    delimiter: ';',
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: cleanHeader,
  });

  const fields = (parsed.meta.fields ?? []).map(cleanHeader);
  const fieldSet = new Set(fields);
  const headerMissing = ORIGINAL_COLUMNS.filter((c) => !fieldSet.has(c));
  const originalSet = new Set<string>(ORIGINAL_COLUMNS as readonly string[]);
  const headerExtra = fields.filter((f) => !originalSet.has(f));

  const errors: RowError[] = [];
  const rows: Employee[] = [];
  const seen = new Set<string>();
  let duplicados = 0;
  let sinGeolocalizar = 0;

  const sid = snapshotId(opts.fecha, opts.empresa);

  if (headerMissing.length > 0) {
    return {
      rows: [], errors, headerMissing, headerExtra,
      duplicados: 0, totalFilas: parsed.data.length, sinGeolocalizar: 0,
    };
  }

  parsed.data.forEach((raw, i) => {
    const fila = i + 2; // +1 header, +1 base 1
    const legajo = (raw['Legajo'] ?? '').trim();

    if (!legajo) {
      errors.push({ fila, legajo: '', campo: 'Legajo', motivo: 'Legajo vacío' });
      return;
    }
    if (!/^\w+$/.test(legajo)) {
      errors.push({ fila, legajo, campo: 'Legajo', motivo: 'Legajo con formato inválido' });
      return;
    }
    if (seen.has(legajo)) {
      duplicados++;
      errors.push({ fila, legajo, campo: 'Legajo', motivo: 'Legajo duplicado en el archivo' });
      return;
    }
    seen.add(legajo);

    const rec: Record<string, string> = {};
    for (const c of ORIGINAL_COLUMNS) rec[c] = (raw[c] ?? '').trim();

    if (!rec['País']) {
      errors.push({ fila, legajo, campo: 'País', motivo: 'País vacío' });
    }

    const geo = resolveGeo(raw, rec, opts, legajo);
    if (geo._geo_precision === 'sin_geolocalizar') sinGeolocalizar++;

    rows.push({
      ...rec,
      ...geo,
      _snapshotId: sid,
      _empresa: opts.empresa,
      _key: `${opts.empresa}:${legajo}`,
    } as Employee);
  });

  return {
    rows, errors, headerMissing, headerExtra,
    duplicados, totalFilas: parsed.data.length, sinGeolocalizar,
  };
}

/**
 * Cascada de geolocalización:
 *  1. lat/lon o localidad/subdivisión presentes en el CSV
 *  2. tabla local configurable sociedad/estructura -> zona
 *  3. marcar `sin_geolocalizar` (nunca inventar en silencio)
 */
function resolveGeo(
  raw: Record<string, string>,
  rec: Record<string, string>,
  opts: ParseOptions,
  legajo: string,
) {
  const jitter = (lat: number, lon: number, radio: number) => {
    const r = mulberry32(hashSeed(legajo));
    const dLat = (r() - 0.5) * 2 * radio;
    const dLon = ((r() - 0.5) * 2 * radio) / Math.cos((lat * Math.PI) / 180);
    return { lat: +(lat + dLat).toFixed(5), lon: +(lon + dLon).toFixed(5) };
  };

  const latRaw = opts.colLat ? raw[opts.colLat] : raw['_geo_lat'];
  const lonRaw = opts.colLon ? raw[opts.colLon] : raw['_geo_lon'];
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (latRaw && lonRaw && Number.isFinite(lat) && Number.isFinite(lon) &&
      Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return {
      _geo_region: raw['_geo_region'] ?? '',
      _geo_subdivision: (opts.colSubdivision ? raw[opts.colSubdivision] : raw['_geo_subdivision']) ?? '',
      _geo_localidad: (opts.colLocalidad ? raw[opts.colLocalidad] : raw['_geo_localidad']) ?? '',
      _geo_lat: lat,
      _geo_lon: lon,
      _geo_precision: 'centroid_jitter' as const,
      _geo_source: 'localidad_lookup' as const,
    };
  }

  const locName = (opts.colLocalidad ? raw[opts.colLocalidad] : raw['_geo_localidad']) ?? '';
  const hitLoc = lookupLocalidad(locName);
  if (hitLoc) {
    const j = jitter(hitLoc.lat, hitLoc.lon, hitLoc.radio);
    return {
      _geo_region: hitLoc.region,
      _geo_subdivision: hitLoc.subdivision,
      _geo_localidad: hitLoc.localidad,
      _geo_lat: j.lat,
      _geo_lon: j.lon,
      _geo_precision: 'centroid_jitter' as const,
      _geo_source: 'localidad_lookup' as const,
    };
  }

  const subName = (opts.colSubdivision ? raw[opts.colSubdivision] : raw['_geo_subdivision']) ?? '';
  const hitSub = lookupSubdivision(subName);
  if (hitSub) {
    const j = jitter(hitSub.lat, hitSub.lon, hitSub.radio * 2);
    return {
      _geo_region: hitSub.region,
      _geo_subdivision: hitSub.subdivision,
      _geo_localidad: '',
      _geo_lat: j.lat,
      _geo_lon: j.lon,
      _geo_precision: 'subdivision_centroid' as const,
      _geo_source: 'localidad_lookup' as const,
    };
  }

  const hitSoc = lookupSociedadZona(rec['Sociedad']);
  if (hitSoc) {
    const j = jitter(hitSoc.lat, hitSoc.lon, hitSoc.radio * 2);
    return {
      _geo_region: hitSoc.region,
      _geo_subdivision: hitSoc.subdivision,
      _geo_localidad: hitSoc.localidad,
      _geo_lat: j.lat,
      _geo_lon: j.lon,
      _geo_precision: 'subdivision_centroid' as const,
      _geo_source: 'sociedad_lookup' as const,
    };
  }

  return {
    _geo_region: '',
    _geo_subdivision: '',
    _geo_localidad: '',
    _geo_lat: null,
    _geo_lon: null,
    _geo_precision: 'sin_geolocalizar' as const,
    _geo_source: 'ninguna' as const,
  };
}

export function errorsToCsv(errors: RowError[]): string {
  const head = 'fila;legajo;campo;motivo';
  const body = errors
    .map((e) => `${e.fila};${e.legajo};${e.campo};${e.motivo.replace(/;/g, ',')}`)
    .join('\n');
  return `${head}\n${body}`;
}
