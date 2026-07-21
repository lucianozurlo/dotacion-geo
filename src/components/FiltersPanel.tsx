import { useMemo, useState, type ReactNode } from 'react';
import {
  DEP_LEVELS, countActiveFilters, dependentDepOptions, fmtNum, liderNombre,
  optionsWithCounts, paisNombre, sortedCounts, countBy,
  type FilterState,
} from '../domain/filters';
import type { Employee } from '../domain/types';
import { fmtFechaCorta } from '../domain/types';

interface Props {
  baseRows: Employee[];
  filteredRows: Employee[];
  filters: FilterState;
  setFilters: (u: (f: FilterState) => FilterState) => void;
  resetFilters: () => void;
  fechas: string[];
  onCollapse: () => void;
}

type ArrayKey =
  | 'empresas' | 'paises' | 'subdivisiones' | 'localidades' | 'generos'
  | 'sociedades' | 'familias' | 'grupos' | 'areas' | 'especialidades'
  | 'titulos' | 'lideres';

const LABELS: Record<ArrayKey, string> = {
  empresas: 'Empresa',
  paises: 'País',
  subdivisiones: 'Provincia / región',
  localidades: 'Localidad',
  generos: 'Género',
  sociedades: 'Sociedad',
  familias: 'Familia de función',
  grupos: 'Grupo de personal',
  areas: 'Área de actividad',
  especialidades: 'Especialidad',
  titulos: 'Título de puesto',
  lideres: 'Líder / supervisor',
};

const GETTERS: Record<ArrayKey, (e: Employee) => string> = {
  empresas: (e) => e._empresa,
  paises: paisNombre,
  subdivisiones: (e) => e._geo_subdivision,
  localidades: (e) => e._geo_localidad,
  generos: (e) => e['Género'],
  sociedades: (e) => e.Sociedad,
  familias: (e) => e['Familia de función'],
  grupos: (e) => e['Grupo de personal'],
  areas: (e) => e['Area de Actividad'],
  especialidades: (e) => e.Especialidad,
  titulos: (e) => e['Título de Puesto'],
  lideres: liderNombre,
};

function Section({
  title, count, children, defaultOpen = false,
}: { title: string; count: number; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `sec-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="panel-section">
      <button
        className="section-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="section-chevron" aria-hidden="true">{open ? '▼' : '▶'}</span>
        <span style={{ flex: 1 }}>{title}</span>
        {count > 0 && <span className="section-count">{count}</span>}
      </button>
      {open && <div className="section-body" id={id}>{children}</div>}
    </div>
  );
}

function OptionList({
  options, selected, onToggle, name,
}: {
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (v: string) => void;
  name: string;
}) {
  if (options.length === 0) {
    return <p className="empty-note" style={{ padding: '6px 0' }}>Sin opciones disponibles.</p>;
  }
  return (
    <div className="opt-list" role="group" aria-label={name}>
      {options.map((o) => (
        <label className="opt" key={o.value}>
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle(o.value)}
          />
          <span className="opt-name" title={o.value}>{o.value}</span>
          <span className="opt-count">{fmtNum(o.count)}</span>
        </label>
      ))}
    </div>
  );
}

export default function FiltersPanel({
  baseRows, filteredRows, filters, setFilters, resetFilters, fechas, onCollapse,
}: Props) {
  const active = countActiveFilters(filters);

  const toggleValue = (key: ArrayKey, v: string) =>
    setFilters((f) => {
      const cur = f[key] as string[];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...f, [key]: next } as FilterState;
    });

  const toggleDep = (lvl: number, v: string) =>
    setFilters((f) => {
      const cur = f.dep[lvl] ?? [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      const dep = { ...f.dep, [lvl]: next };
      // al cambiar un nivel, se limpian los inferiores para evitar combinaciones imposibles
      for (const l of DEP_LEVELS) if (l > lvl) delete dep[l];
      return { ...f, dep };
    });

  /**
   * Los conteos de cada dimensión se calculan ignorando su propia selección,
   * para que el usuario vea cuánto sumaría agregar cada opción.
   */
  const optionsFor = useMemo(() => {
    const cache: Partial<Record<ArrayKey, { value: string; count: number }[]>> = {};
    return (key: ArrayKey) => {
      if (!cache[key]) {
        const sel = filters[key] as string[];
        const source = sel.length ? baseRows : filteredRows;
        cache[key] = optionsWithCounts(source, GETTERS[key]);
      }
      return cache[key]!;
    };
  }, [baseRows, filteredRows, filters]);

  // los líderes pueden ser miles: se muestran los más frecuentes + los ya elegidos
  const lideresOptions = useMemo(() => {
    const top = sortedCounts(countBy(filteredRows, liderNombre), 60)
      .map((x) => ({ value: x.name, count: x.value }));
    const have = new Set(top.map((t) => t.value));
    for (const l of filters.lideres) if (!have.has(l)) top.push({ value: l, count: 0 });
    return top;
  }, [filteredRows, filters.lideres]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = [];
    (Object.keys(LABELS) as ArrayKey[]).forEach((k) => {
      for (const v of filters[k] as string[]) {
        out.push({
          key: `${k}:${v}`,
          label: `${LABELS[k]}: ${v}`,
          onRemove: () => toggleValue(k, v),
        });
      }
    });
    for (const lvl of DEP_LEVELS) {
      for (const v of filters.dep[lvl] ?? []) {
        out.push({
          key: `dep${lvl}:${v}`,
          label: `DepN${lvl}: ${v}`,
          onRemove: () => toggleDep(lvl, v),
        });
      }
    }
    if (filters.q.trim()) {
      out.push({
        key: 'q',
        label: `Búsqueda: ${filters.q}`,
        onRemove: () => setFilters((f) => ({ ...f, q: '' })),
      });
    }
    if (!filters.incluirSinGeo) {
      out.push({
        key: 'nogeo',
        label: 'Sin geolocalizar: ocultos',
        onRemove: () => setFilters((f) => ({ ...f, incluirSinGeo: true })),
      });
    }
    return out;
  }, [filters, setFilters]);

  const depSections = DEP_LEVELS.map((lvl) => {
    const opts = dependentDepOptions(baseRows, filters, lvl);
    return { lvl, opts };
  }).filter((d) => d.opts.length > 0);

  return (
    <aside className="panel" aria-label="Filtros">
      <div className="panel-head">
        <span className="panel-title">Filtros</span>
        {active > 0 && (
          <button className="btn sm" onClick={resetFilters}>Limpiar todo</button>
        )}
        <button className="btn icon sm" onClick={onCollapse} aria-label="Colapsar panel de filtros" title="Colapsar">
          ‹
        </button>
      </div>

      <div className="panel-section">
        <div className="section-body" style={{ paddingTop: 12 }}>
          <div className="field">
            <label htmlFor="f-fecha">Snapshot (fecha)</label>
            <select
              id="f-fecha"
              value={filters.fecha}
              onChange={(e) => setFilters((f) => ({ ...f, fecha: e.target.value }))}
            >
              {fechas.map((d) => (
                <option key={d} value={d}>{fmtFechaCorta(d)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-cmp">Comparar contra</label>
            <select
              id="f-cmp"
              value={filters.fechaComparacion ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, fechaComparacion: e.target.value || null }))
              }
            >
              <option value="">Sin comparación</option>
              {fechas.filter((d) => d !== filters.fecha).map((d) => (
                <option key={d} value={d}>{fmtFechaCorta(d)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-q">Buscar por nombre o legajo</label>
            <input
              id="f-q"
              type="search"
              placeholder="Ej.: SOSA o 10234"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <label className="opt" style={{ padding: '4px 0', border: 'none' }}>
            <input
              type="checkbox"
              checked={filters.incluirSinGeo}
              onChange={() =>
                setFilters((f) => ({ ...f, incluirSinGeo: !f.incluirSinGeo }))
              }
            />
            <span className="opt-name">Incluir registros sin geolocalizar</span>
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="panel-section">
          <div className="chips">
            {chips.map((c) => (
              <span className="chip" key={c.key}>
                <span className="chip-text" title={c.label}>{c.label}</span>
                <button
                  className="chip-x"
                  onClick={c.onRemove}
                  aria-label={`Quitar filtro ${c.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {(['empresas', 'paises', 'subdivisiones', 'localidades'] as ArrayKey[]).map((k) => (
        <Section
          key={k}
          title={LABELS[k]}
          count={(filters[k] as string[]).length}
          defaultOpen={k === 'empresas'}
        >
          <OptionList
            name={LABELS[k]}
            options={optionsFor(k)}
            selected={filters[k] as string[]}
            onToggle={(v) => toggleValue(k, v)}
          />
        </Section>
      ))}

      {(['generos', 'sociedades', 'familias', 'grupos', 'areas', 'especialidades', 'titulos'] as ArrayKey[]).map((k) => (
        <Section key={k} title={LABELS[k]} count={(filters[k] as string[]).length}>
          <OptionList
            name={LABELS[k]}
            options={optionsFor(k)}
            selected={filters[k] as string[]}
            onToggle={(v) => toggleValue(k, v)}
          />
        </Section>
      ))}

      <Section
        title="Estructura DepN1–DepN9"
        count={DEP_LEVELS.reduce((a, l) => a + (filters.dep[l]?.length ?? 0), 0)}
      >
        <p className="empty-note" style={{ padding: '0 0 8px' }}>
          Cada nivel sólo ofrece valores compatibles con los niveles superiores seleccionados.
        </p>
        {depSections.map(({ lvl, opts }) => (
          <div key={lvl} style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 3 }}>
              DepN{lvl} <span className="opt-count">({opts.length})</span>
            </label>
            <OptionList
              name={`DepN${lvl}`}
              options={opts}
              selected={filters.dep[lvl] ?? []}
              onToggle={(v) => toggleDep(lvl, v)}
            />
          </div>
        ))}
      </Section>

      <Section title={LABELS.lideres} count={filters.lideres.length}>
        <p className="empty-note" style={{ padding: '0 0 6px' }}>
          Se muestran los 60 líderes con más reportes en el resultado actual.
        </p>
        <OptionList
          name={LABELS.lideres}
          options={lideresOptions}
          selected={filters.lideres}
          onToggle={(v) => toggleValue('lideres', v)}
        />
      </Section>
    </aside>
  );
}
