import { describe, expect, it } from 'vitest';
import { normalizeFecha, parseCsv } from '../domain/parser';
import { ORIGINAL_COLUMNS } from '../domain/types';

const HEAD = ORIGINAL_COLUMNS.join(';');

function row(over: Partial<Record<string, string>> = {}): string {
  const base: Record<string, string> = {};
  for (const c of ORIGINAL_COLUMNS) base[c] = '';
  base['Legajo'] = '99001';
  base['Nombre'] = 'TEST';
  base['Apellidos'] = 'SINTETICO';
  base['Género'] = 'Mujer';
  base['País'] = 'ARG/01-Argentina';
  base['Sociedad'] = 'Telecom Argentina SA (A001)';
  Object.assign(base, over);
  return ORIGINAL_COLUMNS.map((c) => base[c]).join(';');
}

const OPTS = { empresa: 'Personal' as const, fecha: '2026-08-31' };

describe('normalizeFecha', () => {
  it('acepta dd/mm/yyyy', () => {
    expect(normalizeFecha('21/07/2026')).toBe('2026-07-21');
  });
  it('acepta ISO', () => {
    expect(normalizeFecha('2026-07-21')).toBe('2026-07-21');
  });
  it('rechaza fechas imposibles', () => {
    expect(normalizeFecha('31/02/2026')).toBeNull();
    expect(normalizeFecha('holamundo')).toBeNull();
  });
});

describe('parseCsv', () => {
  it('parsea una fila válida conservando las 44 columnas', () => {
    const r = parseCsv(`${HEAD}\n${row()}`, OPTS);
    expect(r.headerMissing).toHaveLength(0);
    expect(r.rows).toHaveLength(1);
    for (const c of ORIGINAL_COLUMNS) {
      expect(r.rows[0]).toHaveProperty(c);
    }
    expect(r.rows[0]._empresa).toBe('Personal');
    expect(r.rows[0]._snapshotId).toBe('2026-08-31|Personal');
  });

  it('detecta encabezado incompleto y no importa nada', () => {
    const r = parseCsv('Legajo;Nombre\n1;X', OPTS);
    expect(r.headerMissing.length).toBeGreaterThan(0);
    expect(r.rows).toHaveLength(0);
  });

  it('rechaza duplicados de legajo', () => {
    const r = parseCsv(`${HEAD}\n${row()}\n${row()}`, OPTS);
    expect(r.rows).toHaveLength(1);
    expect(r.duplicados).toBe(1);
    expect(r.errors.some((e) => e.motivo.includes('duplicado'))).toBe(true);
  });

  it('rechaza filas sin legajo', () => {
    const r = parseCsv(`${HEAD}\n${row({ Legajo: '' })}`, OPTS);
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].campo).toBe('Legajo');
  });

  it('geolocaliza por la tabla sociedad -> zona cuando faltan coordenadas', () => {
    const r = parseCsv(`${HEAD}\n${row()}`, OPTS);
    expect(r.rows[0]._geo_precision).not.toBe('sin_geolocalizar');
    expect(r.rows[0]._geo_lat).not.toBeNull();
    expect(r.rows[0]._geo_source).toBe('sociedad_lookup');
  });

  it('marca sin_geolocalizar cuando ninguna estrategia aplica', () => {
    const r = parseCsv(`${HEAD}\n${row({ Sociedad: 'Empresa Desconocida SRL' })}`, OPTS);
    expect(r.rows[0]._geo_precision).toBe('sin_geolocalizar');
    expect(r.rows[0]._geo_lat).toBeNull();
    expect(r.sinGeolocalizar).toBe(1);
  });

  it('usa coordenadas del CSV si vienen y son válidas', () => {
    const head = `${HEAD};_geo_lat;_geo_lon`;
    const r = parseCsv(`${head}\n${row()};-32.9468;-60.6393`, OPTS);
    expect(r.rows[0]._geo_lat).toBeCloseTo(-32.9468, 4);
    expect(r.rows[0]._geo_lon).toBeCloseTo(-60.6393, 4);
  });

  it('resuelve por nombre de localidad cuando el CSV la trae', () => {
    const head = `${HEAD};_geo_localidad`;
    const r = parseCsv(`${head}\n${row()};Rosario`, OPTS);
    expect(r.rows[0]._geo_localidad).toBe('Rosario');
    expect(r.rows[0]._geo_subdivision).toBe('Santa Fe');
    expect(r.rows[0]._geo_lat).toBeLessThan(-32);
  });
});
