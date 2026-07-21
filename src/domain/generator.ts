import {
  ALL_DATES, EMPRESAS, LATEST_DATE, PREV_DATES, TARGET_TOTALS,
  snapshotId, type Empresa, type Employee, type SnapshotData,
} from './types';
import {
  APELLIDOS, AREAS_ACTIVIDAD, ESPECIALIDADES, FAMILIAS_FUNCION, FAMILIA_PESOS,
  GENEROS, GENERO_PESOS, GRUPOS_PERSONAL, GRUPO_PESOS, NOMBRES_F, NOMBRES_M,
  NOMBRES_X, SOCIEDADES, TITULOS_PUESTO, UNIDADES_ORG_SUFIJOS,
  PAIS_CODE_FROM_LABEL,
} from './catalogs';
import { LOCALIDADES, type Localidad } from './geoCatalog';
import { buildCumulative, gaussian, hashSeed, mulberry32, pick, pickWeighted } from './rng';
import orgStructureRaw from '../data/orgStructure.json';

/** Cada path es una hoja: [[código, label], ...] hasta 9 niveles. */
type OrgPath = [string, string][];
const ORG_PATHS = orgStructureRaw as unknown as OrgPath[];

export const DEFAULT_SEED = 20260721;

/** Proporción de registros deliberadamente sin geolocalizar (calidad de datos). */
const SIN_GEO_RATIO = 0.018;
/** Proporción de registros con campos organizativos incompletos. */
const INCOMPLETO_RATIO = 0.012;

interface Persona {
  legajo: string;
  nombre: string;
  apellido: string;
  genero: string;
  empresa: Empresa;
  sociedadIdx: number;
  orgPathIdx: number;
  localidadIdx: number;
  lat: number;
  lon: number;
  sinGeo: boolean;
  incompleto: boolean;
  titulo: string;
  familia: string;
  grupo: string;
  area: string;
  especialidad: string;
  supIdx: number;
  supSupIdx: number;
  matrizIdx: number;
  unidadSufijo: string;
  funcCodigo: string;
  posSuperior: string;
}

const localidadesPorPais = (code: string) => LOCALIDADES.filter((l) => l.paisCode === code);

function makeGeoPickers() {
  const cache = new Map<string, { list: Localidad[]; cum: number[] }>();
  return (paisCode: string) => {
    let e = cache.get(paisCode);
    if (!e) {
      const list = localidadesPorPais(paisCode);
      e = { list, cum: buildCumulative(list.map((l) => l.peso)) };
      cache.set(paisCode, e);
    }
    return e;
  };
}

const generoCum = buildCumulative(GENERO_PESOS);
const familiaCum = buildCumulative(FAMILIA_PESOS);
const grupoCum = buildCumulative(GRUPO_PESOS);

function sociedadesDe(empresa: Empresa) {
  const list = SOCIEDADES.filter((s) => s.empresa === empresa);
  return { list, cum: buildCumulative(list.map((s) => s.peso)) };
}

function pad(n: number, len: number) {
  return String(n).padStart(len, '0');
}

/** Crea el "universo" de personas por empresa: superset del que se toman los snapshots. */
function buildPool(empresa: Empresa, size: number, seed: number): Persona[] {
  const rnd = mulberry32(seed ^ hashSeed(empresa));
  const geoFor = makeGeoPickers();
  const soc = sociedadesDe(empresa);
  const base = empresa === 'Personal' ? 10000 : empresa === 'TMA' ? 400000 : 800000;
  const pool: Persona[] = [];

  for (let i = 0; i < size; i++) {
    const gIdx = pickWeighted(rnd, generoCum);
    const genero = GENEROS[gIdx];
    const nombre =
      genero === 'Hombre' ? pick(rnd, NOMBRES_M)
      : genero === 'Mujer' ? pick(rnd, NOMBRES_F)
      : pick(rnd, NOMBRES_X);

    const sociedadIdx = pickWeighted(rnd, soc.cum);
    const sociedad = soc.list[sociedadIdx];
    const paisCode = PAIS_CODE_FROM_LABEL[sociedad.pais];
    const geo = geoFor(paisCode);
    const localidadIdx = pickWeighted(rnd, geo.cum);
    const loc = geo.list[localidadIdx];

    const sinGeo = rnd() < SIN_GEO_RATIO;
    const incompleto = rnd() < INCOMPLETO_RATIO;

    // jitter gaussiano acotado alrededor del centroide urbano
    const dLat = Math.max(-3, Math.min(3, gaussian(rnd))) * loc.radio;
    const dLonRaw = Math.max(-3, Math.min(3, gaussian(rnd))) * loc.radio;
    const dLon = dLonRaw / Math.cos((loc.lat * Math.PI) / 180);

    const area = pick(rnd, AREAS_ACTIVIDAD);
    const especialidad = pick(rnd, ESPECIALIDADES[area]);

    pool.push({
      legajo: String(base + i),
      nombre,
      apellido: pick(rnd, APELLIDOS),
      genero,
      empresa,
      sociedadIdx,
      orgPathIdx: Math.floor(rnd() * ORG_PATHS.length),
      localidadIdx: LOCALIDADES.indexOf(loc),
      lat: +(loc.lat + dLat).toFixed(5),
      lon: +(loc.lon + dLon).toFixed(5),
      sinGeo,
      incompleto,
      titulo: pick(rnd, TITULOS_PUESTO),
      familia: FAMILIAS_FUNCION[pickWeighted(rnd, familiaCum)],
      grupo: GRUPOS_PERSONAL[pickWeighted(rnd, grupoCum)],
      area,
      especialidad,
      supIdx: Math.floor(rnd() * size),
      supSupIdx: Math.floor(rnd() * size),
      matrizIdx: rnd() < 0.25 ? Math.floor(rnd() * size) : -1,
      unidadSufijo: pick(rnd, UNIDADES_ORG_SUFIJOS),
      funcCodigo: pad(50000000 + Math.floor(rnd() * 2000000), 8),
      posSuperior: pad(55000000 + Math.floor(rnd() * 3000000), 8),
    });
  }
  return pool;
}

function toEmployee(p: Persona, pool: Persona[], fecha: string, empresa: Empresa): Employee {
  const soc = sociedadesDe(empresa).list[p.sociedadIdx];
  const path = ORG_PATHS[p.orgPathIdx];
  const loc = LOCALIDADES[p.localidadIdx];
  const sup = pool[p.supIdx] ?? pool[0];
  const supSup = pool[p.supSupIdx] ?? pool[0];
  const matriz = p.matrizIdx >= 0 ? pool[p.matrizIdx] : null;

  const dep: Record<string, string> = {};
  for (let n = 1; n <= 9; n++) {
    const nivel = path[n - 1];
    // los registros "incompletos" pierden los niveles profundos
    const corta = p.incompleto && n >= Math.max(3, path.length - 1);
    dep[`DepN${n} (Código)`] = nivel && !corta ? nivel[0] : '';
    dep[`DepN${n} (Label)`] = nivel && !corta ? nivel[1] : '';
  }

  const hoja = path[path.length - 1];
  const unidadCod = hoja[0] || p.posSuperior;
  const unidadDesc = (hoja[1] || 'SIN ASIGNAR') + p.unidadSufijo;

  const e = {
    Legajo: p.legajo,
    Nombre: p.nombre,
    Apellidos: p.apellido,
    'Género': p.genero,
    'Unidad Organizativa Código': unidadCod,
    'Unidad Organizativa Descripción': unidadDesc,
    'Código': p.funcCodigo,
    'Título de Puesto': p.titulo,
    ...dep,
    'Función Código de puesto': p.funcCodigo,
    'Función Título del puesto': p.titulo,
    'Familia de función': p.familia,
    'Grupo de personal': p.grupo,
    'Area de Actividad': p.incompleto ? '' : p.area,
    Especialidad: p.incompleto ? '' : p.especialidad,
    'ID de sistema del usuario supervisor': sup.legajo,
    'Líder Nombre': sup.nombre,
    'Líder Apellidos': sup.apellido,
    'Posición de nivel superior': p.posSuperior,
    'ID de sistema del usuario supervisor del supervisor': supSup.legajo,
    'Supervisor del supervisor Nombre': supSup.nombre,
    'Supervisor del supervisor Apellidos': supSup.apellido,
    'ID de sistema del usuario supervisor de matriz': matriz ? matriz.legajo : '',
    'Supervisor de matriz Nombre': matriz ? matriz.nombre : '',
    'Supervisor de matriz Apellidos': matriz ? matriz.apellido : '',
    'País': soc.pais,
    Sociedad: soc.sociedad,

    _geo_region: p.sinGeo ? '' : loc.region,
    _geo_subdivision: p.sinGeo ? '' : loc.subdivision,
    _geo_localidad: p.sinGeo ? '' : loc.localidad,
    _geo_lat: p.sinGeo ? null : p.lat,
    _geo_lon: p.sinGeo ? null : p.lon,
    _geo_precision: p.sinGeo ? 'sin_geolocalizar' : 'centroid_jitter',
    _geo_source: p.sinGeo ? 'ninguna' : 'sintetico',

    _snapshotId: snapshotId(fecha, empresa),
    _empresa: empresa,
    _key: `${empresa}:${p.legajo}`,
  } as Employee;

  return e;
}

/**
 * Genera los 3 snapshots (mayo, junio, julio) por empresa.
 * El snapshot de julio tiene EXACTAMENTE los totales objetivo.
 * Los anteriores difieren por altas/bajas plausibles y legajos persistentes.
 */
export function generateAllSnapshots(seed: number = DEFAULT_SEED): SnapshotData[] {
  const out: SnapshotData[] = [];

  for (const empresa of EMPRESAS) {
    const target = TARGET_TOTALS[empresa];
    // pool con margen para modelar altas/bajas sin romper el total de julio
    const poolSize = Math.ceil(target * 1.12);
    const pool = buildPool(empresa, poolSize, seed);
    const rnd = mulberry32(hashSeed(`${seed}:${empresa}:mov`));

    // Julio (latest): primeros `target` del pool -> total exacto.
    const julio = pool.slice(0, target);

    // Junio: sale ~1.5% de julio, entra ~1.2% del excedente del pool.
    const bajasJun = Math.round(target * 0.015);
    const altasJun = Math.round(target * 0.012);
    const junio = [
      ...julio.slice(bajasJun),
      ...pool.slice(target, target + altasJun),
    ];

    // Mayo: idem sobre junio.
    const bajasMay = Math.round(target * 0.013);
    const altasMay = Math.round(target * 0.017);
    const mayo = [
      ...junio.slice(bajasMay),
      ...pool.slice(target + altasJun, target + altasJun + altasMay),
    ];

    const sets: Array<[string, Persona[]]> = [
      [PREV_DATES[0], mayo],
      [PREV_DATES[1], junio],
      [LATEST_DATE, julio],
    ];

    for (const [fecha, personas] of sets) {
      // movimientos internos entre snapshots: cambio de región y cambio organizativo
      const rows = personas.map((p) => {
        let pp = p;
        if (fecha !== LATEST_DATE) {
          const r = mulberry32(hashSeed(`${p.legajo}:${fecha}`))();
          if (r < 0.02) {
            // en el pasado estaba en otra localidad del mismo país
            const paisCode = PAIS_CODE_FROM_LABEL[sociedadesDe(empresa).list[p.sociedadIdx].pais];
            const cand = localidadesPorPais(paisCode);
            const alt = cand[Math.floor(r * 50 * cand.length) % cand.length];
            pp = {
              ...p,
              localidadIdx: LOCALIDADES.indexOf(alt),
              lat: +(alt.lat + (r - 0.01) * alt.radio * 40).toFixed(5),
              lon: +(alt.lon + (r - 0.01) * alt.radio * 40).toFixed(5),
            };
          } else if (r < 0.05) {
            // en el pasado tenía otra estructura organizativa
            pp = { ...p, orgPathIdx: (p.orgPathIdx + 137) % ORG_PATHS.length };
          }
        }
        return toEmployee(pp, pool, fecha, empresa);
      });

      out.push({
        snapshot: {
          id: snapshotId(fecha, empresa),
          fecha,
          empresa,
          origen: 'sintetico',
          total: rows.length,
          createdAt: Date.now(),
        },
        rows,
      });
    }
    void rnd;
  }

  return out;
}

export { ALL_DATES };
