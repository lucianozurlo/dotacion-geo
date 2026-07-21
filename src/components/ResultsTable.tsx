import { useRef, useState } from 'react';
import type { Employee } from '../domain/types';
import { fmtNum, liderNombre } from '../domain/filters';

const ROW_H = 30;
const OVERSCAN = 8;

export default function ResultsTable({ rows }: { rows: Employee[] }) {
  const [open, setOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const viewportH = 260;

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN);
  const slice = rows.slice(start, end);

  return (
    <div className="table-wrap">
      <div className="table-head">
        <button
          className="btn sm"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '▼' : '▶'} Detalle de empleados
        </button>
        <span style={{ color: 'var(--fg-muted)' }}>{fmtNum(rows.length)} registros</span>
      </div>

      {open && (
        <div
          className="vtable"
          ref={ref}
          style={{ height: viewportH }}
          onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          tabIndex={0}
          role="region"
          aria-label="Tabla de empleados sintéticos"
        >
          <div style={{ height: rows.length * ROW_H, position: 'relative' }}>
            <div className="vrow head" style={{ top: 0, height: ROW_H }}>
              <span>Legajo</span>
              <span>Nombre</span>
              <span>Empresa</span>
              <span>Localidad</span>
              <span>Líder</span>
            </div>
            {slice.map((r, i) => {
              const idx = start + i;
              return (
                <div
                  className="vrow"
                  key={r._key}
                  style={{ top: (idx + 1) * ROW_H, height: ROW_H }}
                >
                  <span className="mono">{r.Legajo}</span>
                  <span title={`${r.Nombre} ${r.Apellidos}`}>{r.Nombre} {r.Apellidos}</span>
                  <span>{r._empresa}</span>
                  <span title={r._geo_localidad}>
                    {r._geo_localidad || <em style={{ color: 'var(--warn)' }}>sin geolocalizar</em>}
                  </span>
                  <span title={liderNombre(r)}>{liderNombre(r)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
