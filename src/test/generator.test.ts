import { describe, expect, it } from 'vitest';
import { generateAllSnapshots, DEFAULT_SEED } from '../domain/generator';
import { ALL_DATES, LATEST_DATE, ORIGINAL_COLUMNS, TARGET_TOTALS } from '../domain/types';

const data = generateAllSnapshots(DEFAULT_SEED);

describe('generador de snapshots', () => {
  it('genera 3 fechas × 3 empresas', () => {
    expect(data).toHaveLength(9);
    expect([...new Set(data.map((d) => d.snapshot.fecha))].sort()).toEqual(ALL_DATES);
  });

  it('el snapshot del 21/07/2026 tiene los totales exactos', () => {
    for (const [empresa, total] of Object.entries(TARGET_TOTALS)) {
      const s = data.find((d) => d.snapshot.fecha === LATEST_DATE && d.snapshot.empresa === empresa);
      expect(s, empresa).toBeDefined();
      expect(s!.rows).toHaveLength(total);
      expect(s!.snapshot.total).toBe(total);
    }
  });

  it('conserva las 44 columnas originales y agrega los campos derivados', () => {
    const r = data[0].rows[0];
    for (const c of ORIGINAL_COLUMNS) expect(r).toHaveProperty(c);
    expect(r).toHaveProperty('_geo_lat');
    expect(r).toHaveProperty('_geo_precision');
  });

  it('es determinístico con la misma seed', () => {
    const a = generateAllSnapshots(12345);
    const b = generateAllSnapshots(12345);
    expect(a[0].rows[0].Legajo).toBe(b[0].rows[0].Legajo);
    expect(a[0].rows[0]._geo_lat).toBe(b[0].rows[0]._geo_lat);
    expect(a[0].rows[10].Nombre).toBe(b[0].rows[10].Nombre);
  });

  it('produce datasets distintos con seeds distintas', () => {
    const a = generateAllSnapshots(1);
    const b = generateAllSnapshots(2);
    expect(a[0].rows[0]._geo_lat).not.toBe(b[0].rows[0]._geo_lat);
  });

  it('los legajos son únicos dentro de cada snapshot', () => {
    for (const d of data) {
      expect(new Set(d.rows.map((r) => r.Legajo)).size).toBe(d.rows.length);
    }
  });

  it('los legajos persisten entre snapshots de la misma empresa', () => {
    const jul = data.find((d) => d.snapshot.fecha === LATEST_DATE && d.snapshot.empresa === 'TMA')!;
    const jun = data.find((d) => d.snapshot.fecha === '2026-06-30' && d.snapshot.empresa === 'TMA')!;
    const setJun = new Set(jun.rows.map((r) => r.Legajo));
    const overlap = jul.rows.filter((r) => setJun.has(r.Legajo)).length;
    expect(overlap / jul.rows.length).toBeGreaterThan(0.9);
    expect(overlap).toBeLessThan(jul.rows.length);
  });

  it('incluye casos sin geolocalizar para validar calidad de datos', () => {
    const jul = data.find((d) => d.snapshot.fecha === LATEST_DATE && d.snapshot.empresa === 'Personal')!;
    const sinGeo = jul.rows.filter((r) => r._geo_precision === 'sin_geolocalizar');
    expect(sinGeo.length).toBeGreaterThan(0);
    expect(sinGeo.length / jul.rows.length).toBeLessThan(0.05);
    for (const r of sinGeo) expect(r._geo_lat).toBeNull();
  });

  it('cubre Argentina, Uruguay, Chile y Paraguay', () => {
    const paises = new Set(data.flatMap((d) => d.rows.map((r) => r['País'])));
    expect([...paises].some((p) => p.includes('Argentina'))).toBe(true);
    expect([...paises].some((p) => p.includes('Uruguay'))).toBe(true);
    expect([...paises].some((p) => p.includes('Chile'))).toBe(true);
    expect([...paises].some((p) => p.includes('Paraguay'))).toBe(true);
  });

  it('las coordenadas caen dentro del cono sur', () => {
    const jul = data.find((d) => d.snapshot.fecha === LATEST_DATE && d.snapshot.empresa === 'Personal')!;
    for (const r of jul.rows.slice(0, 500)) {
      if (r._geo_lat == null) continue;
      expect(r._geo_lat).toBeGreaterThan(-56);
      expect(r._geo_lat).toBeLessThan(-20);
      expect(r._geo_lon!).toBeGreaterThan(-76);
      expect(r._geo_lon!).toBeLessThan(-52);
    }
  });

  it('respeta las jerarquías DepN sin saltos de nivel', () => {
    const jul = data.find((d) => d.snapshot.fecha === LATEST_DATE && d.snapshot.empresa === 'Personal')!;
    for (const r of jul.rows.slice(0, 300)) {
      const rec = r as unknown as Record<string, string>;
      let vacio = false;
      for (let n = 1; n <= 9; n++) {
        const has = !!rec[`DepN${n} (Label)`];
        if (!has) vacio = true;
        else expect(vacio, `DepN${n} poblado tras un nivel vacío`).toBe(false);
      }
    }
  });
});
