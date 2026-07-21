import { describe, expect, it } from 'vitest';
import {
  applyFilters, compareSnapshots, dependentDepOptions, emptyFilters, paisNombre,
} from '../domain/filters';
import { ORIGINAL_COLUMNS, type Employee } from '../domain/types';

function emp(over: Partial<Record<string, unknown>>): Employee {
  const base: Record<string, unknown> = {};
  for (const c of ORIGINAL_COLUMNS) base[c] = '';
  Object.assign(base, {
    Legajo: '1', Nombre: 'A', Apellidos: 'B', 'Género': 'Mujer',
    'País': 'ARG/01-Argentina', Sociedad: 'S1',
    'Familia de función': 'COLABORADOR', 'Grupo de personal': 'CONTRIBUIDOR INDIVIDUAL',
    'Area de Actividad': 'IT', Especialidad: 'Dev', 'Título de Puesto': 'Analista',
    'Líder Nombre': 'LIDER', 'Líder Apellidos': 'UNO',
    'Unidad Organizativa Código': 'U1',
    _geo_region: 'AMBA', _geo_subdivision: 'Buenos Aires', _geo_localidad: 'Vicente López',
    _geo_lat: -34.5, _geo_lon: -58.4, _geo_precision: 'centroid_jitter', _geo_source: 'sintetico',
    _snapshotId: '2026-07-21|Personal', _empresa: 'Personal', _key: 'Personal:1',
  });
  Object.assign(base, over);
  return base as Employee;
}

const F = () => emptyFilters('2026-07-21');

describe('filtros', () => {
  it('sin filtros devuelve todo', () => {
    const rows = [emp({}), emp({ Legajo: '2', _key: 'Personal:2' })];
    expect(applyFilters(rows, F())).toHaveLength(2);
  });

  it('OR dentro de una misma dimensión', () => {
    const rows = [
      emp({ Legajo: '1', _empresa: 'Personal', _key: 'a' }),
      emp({ Legajo: '2', _empresa: 'TMA', _key: 'b' }),
      emp({ Legajo: '3', _empresa: 'Personal Paraguay', _key: 'c' }),
    ];
    const f = { ...F(), empresas: ['Personal', 'TMA'] as never };
    expect(applyFilters(rows, f)).toHaveLength(2);
  });

  it('AND entre dimensiones distintas', () => {
    const rows = [
      emp({ Legajo: '1', _empresa: 'Personal', 'Género': 'Mujer', _key: 'a' }),
      emp({ Legajo: '2', _empresa: 'Personal', 'Género': 'Hombre', _key: 'b' }),
      emp({ Legajo: '3', _empresa: 'TMA', 'Género': 'Mujer', _key: 'c' }),
    ];
    const f = { ...F(), empresas: ['Personal'] as never, generos: ['Mujer'] };
    const out = applyFilters(rows, f);
    expect(out).toHaveLength(1);
    expect(out[0].Legajo).toBe('1');
  });

  it('la búsqueda libre matchea nombre, apellido y legajo', () => {
    const rows = [emp({ Legajo: '5551', Nombre: 'LUCIA', Apellidos: 'SOSA', _key: 'a' })];
    expect(applyFilters(rows, { ...F(), q: 'sosa' })).toHaveLength(1);
    expect(applyFilters(rows, { ...F(), q: '5551' })).toHaveLength(1);
    expect(applyFilters(rows, { ...F(), q: 'ZZZ' })).toHaveLength(0);
  });

  it('permite ocultar registros sin geolocalizar', () => {
    const rows = [
      emp({ Legajo: '1', _key: 'a' }),
      emp({ Legajo: '2', _key: 'b', _geo_precision: 'sin_geolocalizar', _geo_lat: null, _geo_lon: null }),
    ];
    expect(applyFilters(rows, { ...F(), incluirSinGeo: false })).toHaveLength(1);
  });

  it('paisNombre extrae el nombre legible', () => {
    expect(paisNombre(emp({ 'País': 'PRY/02-Paraguay' }))).toBe('Paraguay');
  });
});

describe('opciones dependientes DepN', () => {
  const rows = [
    emp({ Legajo: '1', _key: 'a', 'DepN1 (Label)': 'DIRECTORIO', 'DepN2 (Label)': 'CEO', 'DepN3 (Label)': 'COO' }),
    emp({ Legajo: '2', _key: 'b', 'DepN1 (Label)': 'DIRECTORIO', 'DepN2 (Label)': 'CEO', 'DepN3 (Label)': 'CAPITAL HUMANO' }),
    emp({ Legajo: '3', _key: 'c', 'DepN1 (Label)': 'OTRO', 'DepN2 (Label)': 'X', 'DepN3 (Label)': 'Y' }),
  ];

  it('sin selección devuelve todas las opciones del nivel', () => {
    expect(dependentDepOptions(rows, F(), 1).map((o) => o.value).sort())
      .toEqual(['DIRECTORIO', 'OTRO']);
  });

  it('no ofrece combinaciones imposibles al filtrar el nivel superior', () => {
    const f = { ...F(), dep: { 1: ['DIRECTORIO'] } };
    const n3 = dependentDepOptions(rows, f, 3).map((o) => o.value).sort();
    expect(n3).toEqual(['CAPITAL HUMANO', 'COO']);
    expect(n3).not.toContain('Y');
  });
});

describe('comparación de snapshots', () => {
  it('clasifica altas, bajas y permanencias', () => {
    const previo = [
      emp({ Legajo: '1', _key: 'a' }),
      emp({ Legajo: '2', _key: 'b' }),
    ];
    const actual = [
      emp({ Legajo: '1', _key: 'a' }),
      emp({ Legajo: '3', _key: 'c' }),
    ];
    const m = compareSnapshots(actual, previo);
    expect(m.altas.map((x) => x.Legajo)).toEqual(['3']);
    expect(m.bajas.map((x) => x.Legajo)).toEqual(['2']);
    expect(m.permanencias).toBe(1);
  });

  it('detecta cambio de empresa, región y unidad organizativa', () => {
    const previo = [
      emp({ Legajo: '1', _key: 'a', _empresa: 'TMA' }),
      emp({ Legajo: '2', _key: 'b', _geo_subdivision: 'Córdoba' }),
      emp({ Legajo: '3', _key: 'c', 'Unidad Organizativa Código': 'U9' }),
    ];
    const actual = [
      emp({ Legajo: '1', _key: 'a', _empresa: 'Personal' }),
      emp({ Legajo: '2', _key: 'b', _geo_subdivision: 'Buenos Aires' }),
      emp({ Legajo: '3', _key: 'c', 'Unidad Organizativa Código': 'U1' }),
    ];
    const m = compareSnapshots(actual, previo);
    expect(m.cambioEmpresa).toHaveLength(1);
    expect(m.cambioRegion).toHaveLength(1);
    expect(m.cambioOrganizativo).toHaveLength(1);
  });
});
