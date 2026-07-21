import { useMemo } from 'react';
import type { Employee } from '../domain/types';
import { EMPRESA_COLOR, fmtFechaCorta } from '../domain/types';
import {
  countBy, fmtNum, paisNombre, pct, sortedCounts,
  type FilterState, type Movimientos,
} from '../domain/filters';

interface Props {
  rows: Employee[];
  filters: FilterState;
  setFilters: (u: (f: FilterState) => FilterState) => void;
  comparison: Movimientos | null;
  onCollapse: () => void;
}

function BarList({
  data, total, colorFor, onPick,
}: {
  data: { name: string; value: number }[];
  total: number;
  colorFor?: (n: string) => string;
  onPick?: (n: string) => void;
}) {
  if (data.length === 0) return <p className="empty-note" style={{ padding: 0 }}>Sin datos.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d) => {
        const inner = (
          <>
            <div className="bar-meta">
              <span className="bar-name" title={d.name}>{d.name}</span>
              <span className="bar-val">{fmtNum(d.value)} · {pct(d.value, total)}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: colorFor?.(d.name) ?? 'var(--accent)',
                }}
              />
            </div>
          </>
        );
        return onPick ? (
          <button
            key={d.name}
            className="bar-row"
            onClick={() => onPick(d.name)}
            style={{
              display: 'block', width: '100%', background: 'none',
              border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
            }}
            title={`Filtrar el mapa por ${d.name}`}
          >
            {inner}
          </button>
        ) : (
          <div className="bar-row" key={d.name}>{inner}</div>
        );
      })}
    </div>
  );
}

export default function InsightsPanel({
  rows, filters, setFilters, comparison, onCollapse,
}: Props) {
  const total = rows.length;

  const empresas = useMemo(
    () => sortedCounts(countBy(rows, (e) => e._empresa)),
    [rows],
  );
  const paises = useMemo(() => sortedCounts(countBy(rows, paisNombre)), [rows]);
  const areas = useMemo(
    () => sortedCounts(countBy(rows, (e) => e['Area de Actividad']), 8),
    [rows],
  );
  const generos = useMemo(() => sortedCounts(countBy(rows, (e) => e['Género'])), [rows]);
  const calidad = useMemo(() => {
    const sinGeo = rows.filter((r) => r._geo_precision === 'sin_geolocalizar').length;
    const aprox = rows.filter((r) => r._geo_precision === 'subdivision_centroid').length;
    return { sinGeo, aprox };
  }, [rows]);

  const pickArray = (key: 'paises' | 'areas' | 'generos') => (v: string) =>
    setFilters((f) => {
      const cur = f[key] as string[];
      return {
        ...f,
        [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
      } as FilterState;
    });

  return (
    <aside className="panel right" aria-label="Panel de insights">
      <div className="panel-head">
        <span className="panel-title">Insights</span>
        <button className="btn icon sm" onClick={onCollapse} aria-label="Colapsar panel de insights" title="Colapsar">
          ›
        </button>
      </div>

      <div className="insight-block">
        <h3 className="insight-title">Distribución por empresa</h3>
        <BarList
          data={empresas}
          total={total}
          colorFor={(n) => EMPRESA_COLOR[n as keyof typeof EMPRESA_COLOR] ?? 'var(--accent)'}
        />
      </div>

      <div className="insight-block">
        <h3 className="insight-title">Distribución por país</h3>
        <BarList data={paises} total={total} onPick={pickArray('paises')} />
      </div>

      <div className="insight-block">
        <h3 className="insight-title">Top áreas funcionales</h3>
        <BarList data={areas} total={total} onPick={pickArray('areas')} />
      </div>

      <div className="insight-block">
        <h3 className="insight-title">Distribución por género</h3>
        <BarList data={generos} total={total} onPick={pickArray('generos')} />
      </div>

      {comparison ? (
        <div className="insight-block">
          <h3 className="insight-title">
            Movimientos vs. {filters.fechaComparacion ? fmtFechaCorta(filters.fechaComparacion) : ''}
          </h3>
          <div className="mov-grid">
            <div className="mov-card alta">
              <span className="n">{fmtNum(comparison.altas.length)}</span>
              <span className="l">Altas</span>
            </div>
            <div className="mov-card baja">
              <span className="n">{fmtNum(comparison.bajas.length)}</span>
              <span className="l">Bajas</span>
            </div>
            <div className="mov-card">
              <span className="n">{fmtNum(comparison.permanencias)}</span>
              <span className="l">Permanencias</span>
            </div>
            <div className="mov-card">
              <span className="n">{fmtNum(comparison.cambioEmpresa.length)}</span>
              <span className="l">Cambio empresa</span>
            </div>
            <div className="mov-card">
              <span className="n">{fmtNum(comparison.cambioRegion.length)}</span>
              <span className="l">Cambio región</span>
            </div>
            <div className="mov-card">
              <span className="n">{fmtNum(comparison.cambioOrganizativo.length)}</span>
              <span className="l">Cambio organizativo</span>
            </div>
          </div>
          <p className="empty-note" style={{ padding: '8px 0 0' }}>
            Base de comparación: {fmtNum(comparison.permanencias + comparison.bajas.length)} personas
            en el snapshot previo, con los mismos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="insight-block">
          <h3 className="insight-title">Comparación entre snapshots</h3>
          <p className="empty-note" style={{ padding: 0 }}>
            Elegí una fecha en “Comparar contra” para ver altas, bajas y movimientos.
          </p>
        </div>
      )}

      <div className="insight-block">
        <h3 className="insight-title">Calidad de datos geográficos</h3>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {fmtNum(calidad.sinGeo)} registros sin geolocalizar ({pct(calidad.sinGeo, total)}) ·{' '}
          {fmtNum(calidad.aprox)} ubicados por centroide de subdivisión.
        </p>
        <p className="empty-note" style={{ padding: '6px 0 0' }}>
          Las coordenadas son sintéticas y se dispersan alrededor de centroides urbanos.
          No representan domicilios reales.
        </p>
      </div>
    </aside>
  );
}
