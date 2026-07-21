/** Las 44 columnas originales del extract, en orden. NO renombrar. */
export const ORIGINAL_COLUMNS = [
  'Legajo',
  'Nombre',
  'Apellidos',
  'Género',
  'Unidad Organizativa Código',
  'Unidad Organizativa Descripción',
  'Código',
  'Título de Puesto',
  'DepN1 (Código)',
  'DepN1 (Label)',
  'DepN2 (Código)',
  'DepN2 (Label)',
  'DepN3 (Código)',
  'DepN3 (Label)',
  'DepN4 (Código)',
  'DepN4 (Label)',
  'DepN5 (Código)',
  'DepN5 (Label)',
  'DepN6 (Código)',
  'DepN6 (Label)',
  'DepN7 (Código)',
  'DepN7 (Label)',
  'DepN8 (Código)',
  'DepN8 (Label)',
  'DepN9 (Código)',
  'DepN9 (Label)',
  'Función Código de puesto',
  'Función Título del puesto',
  'Familia de función',
  'Grupo de personal',
  'Area de Actividad',
  'Especialidad',
  'ID de sistema del usuario supervisor',
  'Líder Nombre',
  'Líder Apellidos',
  'Posición de nivel superior',
  'ID de sistema del usuario supervisor del supervisor',
  'Supervisor del supervisor Nombre',
  'Supervisor del supervisor Apellidos',
  'ID de sistema del usuario supervisor de matriz',
  'Supervisor de matriz Nombre',
  'Supervisor de matriz Apellidos',
  'País',
  'Sociedad',
] as const;

export type OriginalColumn = (typeof ORIGINAL_COLUMNS)[number];

/** Campos DERIVADOS (no vienen del origen). Prefijo `_geo` para dejarlo explícito. */
export interface DerivedGeo {
  _geo_region: string;
  _geo_subdivision: string;
  _geo_localidad: string;
  _geo_lat: number | null;
  _geo_lon: number | null;
  /** exact = nunca se usa; centroid_jitter = sintético; sin_geolocalizar = no ubicable */
  _geo_precision: 'centroid_jitter' | 'subdivision_centroid' | 'sin_geolocalizar';
  _geo_source: 'sintetico' | 'localidad_lookup' | 'sociedad_lookup' | 'ninguna';
}

export type Empresa = 'Personal' | 'TMA' | 'Personal Paraguay';

/** Registro plano usado en runtime: 44 originales + derivados + metadatos de snapshot. */
export type Employee = Record<OriginalColumn, string> &
  DerivedGeo & {
    _snapshotId: string;
    _empresa: Empresa;
    /** clave estable inter-snapshot */
    _key: string;
  };

export interface Snapshot {
  /** `${fechaISO}|${empresa}` */
  id: string;
  /** ISO yyyy-mm-dd */
  fecha: string;
  empresa: Empresa;
  origen: 'sintetico' | 'importado';
  total: number;
  createdAt: number;
}

export interface SnapshotData {
  snapshot: Snapshot;
  rows: Employee[];
}

export const LATEST_DATE = '2026-07-21';
export const PREV_DATES = ['2026-05-31', '2026-06-30'];
export const ALL_DATES = [...PREV_DATES, LATEST_DATE];

export const EMPRESAS: Empresa[] = ['Personal', 'TMA', 'Personal Paraguay'];

export const EMPRESA_COLOR: Record<Empresa, string> = {
  Personal: '#00a9e0',
  TMA: '#7b4bd1',
  'Personal Paraguay': '#e0570a',
};

export const TARGET_TOTALS: Record<Empresa, number> = {
  Personal: 17768,
  TMA: 8711,
  'Personal Paraguay': 1200,
};

export function fmtFechaLarga(iso: string): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${meses[m - 1]} de ${y}`;
}

export function fmtFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function snapshotId(fecha: string, empresa: Empresa): string {
  return `${fecha}|${empresa}`;
}
