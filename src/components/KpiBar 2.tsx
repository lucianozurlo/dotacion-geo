import { useMemo } from 'react';
import type { Employee } from '../domain/types';
import { EMPRESAS } from '../domain/types';
import { countBy, fmtNum, paisNombre, pct, type FilterState } from '../domain/filters';
import type { Movimientos } from '../domain/filters';

interface Props {
  rows: Employee[];
  baseTotal: number;
  filters: FilterState;
  setFilters: (u: (f: FilterState) => FilterState) => void;
  comparison: Movimientos | null;
  prevTotal: number;
}

export default function KpiBar({
  rows, baseTotal, filters, setFilters, comparison, prevTotal,
}: Props) {
  const porEmpresa = useMemo(() => countBy(rows, (e) => e._empresa), [rows]);
  const porPais = useMemo(() => countBy(rows, paisNombre), [rows]);
  const porGenero = useMemo(() => countBy(rows, (e) => e['Género']), [rows]);

  const total = rows.length;
  const mujeres = porGenero.get('Mujer') ?? 0;
  const delta = comparison ? total - prevTotal : null;

  const toggleEmpresa = (emp: string) =>
    setFilters((f) => ({
      ...f,
      empresas: f.empresas.includes(emp as never)
        ? f.empresas.filter((x) => x !== emp)
        : ([...f.empresas, emp] as never),
    }));

  const toggleGeneroMujer = () =>
    setFilters((f) => ({
      ...f,
      generos: f.generos.includes('Mujer')
        ? f.generos.filter((g) => g !== 'Mujer')
        : [...f.generos, 'Mujer'],
    }));

  return (
    <section className="kpis" aria-label="Indicadores clave">
      <div className="kpi" data-static="true">
        <span className="kpi-label">Dotación visible</span>
        <span className="kpi-value">{fmtNum(total)}</span>
        <span className="kpi-sub">
          {total === baseTotal
            ? 'Sin filtros aplicados'
            : `${pct(total, baseTotal)} de ${fmtNum(baseTotal)} del snapshot`}
        </span>
      </div>

      {EMPRESAS.map((emp) => {
        const n = porEmpresa.get(emp) ?? 0;
        const on = filters.empresas.includes(emp);
        return (
          <button
            key={emp}
            className="kpi"
            aria-pressed={on}
            onClick={() => toggleEmpresa(emp)}
            title={`Filtrar el mapa por ${emp}`}
          >
            <span className="kpi-label">{emp}</span>
            <span className="kpi-value">{fmtNum(n)}</span>
            <span className="kpi-sub">{pct(n, total)} de lo visible</span>
          </button>
        );
      })}

      <div className="kpi" data-static="true">
        <span className="kpi-label">Países activos</span>
        <span className="kpi-value">{porPais.size}</span>
        <span className="kpi-sub">
          {[...porPais.keys()].sort().join(' · ') || 'Sin datos'}
        </span>
      </div>

      <button
        className="kpi"
        aria-pressed={filters.generos.includes('Mujer')}
        onClick={toggleGeneroMujer}
        title="Filtrar el mapa por género Mujer"
      >
        <span className="kpi-label">Participación femenina</span>
        <span className="kpi-value">{pct(mujeres, total)}</span>
        <span className="kpi-sub">{fmtNum(mujeres)} personas</span>
      </button>

      {comparison && delta !== null && (
        <div className="kpi" data-static="true">
          <span className="kpi-label">Variación vs. snapshot previo</span>
          <span className="kpi-value">
            {delta > 0 ? '+' : ''}{fmtNum(delta)}
          </span>
          <span className={`kpi-sub ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
            {prevTotal ? pct(Math.abs(delta), prevTotal) : '—'} sobre {fmtNum(prevTotal)}
          </span>
        </div>
      )}
    </section>
  );
}
