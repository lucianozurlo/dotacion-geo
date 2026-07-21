import { useMemo, useState } from 'react';
import './styles/app.css';
import { useDataset } from './state/useDataset';
import { LATEST_DATE, fmtFechaLarga } from './domain/types';
import { fmtNum } from './domain/filters';
import MapView, { type LayerToggles } from './components/MapView';
import FiltersPanel from './components/FiltersPanel';
import InsightsPanel from './components/InsightsPanel';
import KpiBar from './components/KpiBar';
import ResultsTable from './components/ResultsTable';
import ImportModal from './components/ImportModal';

export default function App() {
  const ds = useDataset();
  const [showFilters, setShowFilters] = useState(true);
  const [showInsights, setShowInsights] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [layers, setLayers] = useState<LayerToggles>({
    clusters: true,
    puntos: true,
    heatmap: false,
    paises: true,
    subdivisiones: false,
  });

  const prevTotal = useMemo(
    () => (ds.comparison ? ds.comparison.permanencias + ds.comparison.bajas.length : 0),
    [ds.comparison],
  );

  const loading = ds.status === 'loading' || ds.status === 'idle';

  const cls = ['app-body', showFilters ? '' : 'no-sidebar', showInsights ? '' : 'no-insights']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app">
      <a className="skip-link" href="#mapa">Saltar al mapa</a>

      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Dotación Geo</span>
          <span className="brand-sub">Personal · TMA · Post-fusión</span>
        </div>
        <div className="header-spacer" />
        <div className="header-date">
          Última dotación: <strong>{fmtFechaLarga(LATEST_DATE)}</strong>
        </div>
        <button className="btn" onClick={() => setImportOpen(true)}>Importar snapshot</button>
      </header>

      {ds.status === 'error' && (
        <div className="alert err" style={{ margin: 12 }} role="alert">
          No se pudieron generar los datos: {ds.error}
        </div>
      )}

      <KpiBar
        rows={ds.rows}
        baseTotal={ds.baseRows.length}
        filters={ds.filters}
        setFilters={ds.setFilters}
        comparison={ds.comparison}
        prevTotal={prevTotal}
      />

      <div className={cls}>
        {showFilters ? (
          <FiltersPanel
            baseRows={ds.baseRows}
            filteredRows={ds.rows}
            filters={ds.filters}
            setFilters={ds.setFilters}
            resetFilters={ds.resetFilters}
            fechas={ds.fechas}
            onCollapse={() => setShowFilters(false)}
          />
        ) : (
          <div className="panel-collapsed">
            <button
              className="btn icon sm"
              onClick={() => setShowFilters(true)}
              aria-label="Abrir panel de filtros"
              title="Filtros"
            >
              ›
            </button>
          </div>
        )}

        <main
          id="mapa"
          style={{ display: 'grid', gridTemplateRows: '1fr auto', minHeight: 0, minWidth: 0 }}
        >
          <MapView rows={ds.rows} loading={loading} layers={layers} onLayersChange={setLayers} />
          <ResultsTable rows={ds.rows} />
        </main>

        {showInsights ? (
          <InsightsPanel
            rows={ds.rows}
            filters={ds.filters}
            setFilters={ds.setFilters}
            comparison={ds.comparison}
            onCollapse={() => setShowInsights(false)}
          />
        ) : (
          <div className="panel-collapsed right">
            <button
              className="btn icon sm"
              onClick={() => setShowInsights(true)}
              aria-label="Abrir panel de insights"
              title="Insights"
            >
              ‹
            </button>
          </div>
        )}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {loading ? 'Generando datos' : `${fmtNum(ds.rows.length)} empleados visibles`}
      </p>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={ds.addSnapshot}
        onReload={ds.reloadImported}
        snapshots={ds.snapshots}
      />
    </div>
  );
}
