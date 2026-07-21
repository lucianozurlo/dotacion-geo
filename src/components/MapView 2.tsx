import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { Employee } from '../domain/types';
import { EMPRESA_COLOR } from '../domain/types';
import { INITIAL_BOUNDS } from '../domain/geoCatalog';
import { fmtNum } from '../domain/filters';

export interface LayerToggles {
  clusters: boolean;
  puntos: boolean;
  heatmap: boolean;
  paises: boolean;
  subdivisiones: boolean;
}

interface Props {
  rows: Employee[];
  loading: boolean;
  layers: LayerToggles;
  onLayersChange: (l: LayerToggles) => void;
}

const SRC = 'dotacion';
const SRC_ADMIN0 = 'admin0';
const SRC_ADMIN1 = 'admin1';

/** Basemap sin API key: raster de OSM (uso libre con atribución). */
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0d1117' } },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: { 'raster-opacity': 0.42, 'raster-saturation': -0.85, 'raster-brightness-max': 0.72 },
    },
  ],
};

function toFeatureCollection(rows: Employee[]): FeatureCollection {
  const features: Feature[] = [];
  for (const r of rows) {
    if (r._geo_lat == null || r._geo_lon == null) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r._geo_lon, r._geo_lat] },
      properties: {
        legajo: r.Legajo,
        nombre: `${r.Nombre} ${r.Apellidos}`,
        empresa: r._empresa,
        puesto: r['Título de Puesto'],
        area: r['Area de Actividad'],
        especialidad: r.Especialidad,
        genero: r['Género'],
        loc: r._geo_localidad,
        sub: r._geo_subdivision,
        pais: r['País'],
        sociedad: r.Sociedad,
        lider: `${r['Líder Nombre']} ${r['Líder Apellidos']}`.trim(),
        dep: [1, 2, 3, 4, 5]
          .map((n) => (r as unknown as Record<string, string>)[`DepN${n} (Label)`])
          .filter(Boolean)
          .join(' › '),
        prec: r._geo_precision,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

function fichaHtml(p: Record<string, unknown>): string {
  const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
    );
  const row = (k: string, v: unknown) =>
    v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : '';
  return `<div class="ficha">
    <h3>${esc(p.nombre)}</h3>
    <div class="ficha-sub">Legajo ${esc(p.legajo)} · ${esc(p.empresa)}</div>
    <dl>
      ${row('Puesto', p.puesto)}
      ${row('Área', p.area)}
      ${row('Especialidad', p.especialidad)}
      ${row('Género', p.genero)}
      ${row('Líder', p.lider)}
      ${row('Estructura', p.dep)}
      ${row('Localidad', p.loc)}
      ${row('Subdivisión', p.sub)}
      ${row('Sociedad', p.sociedad)}
    </dl>
    <div class="badge-synth">Empleado sintético · ubicación aproximada (${esc(p.prec)}), no representa un domicilio</div>
  </div>`;
}

export default function MapView({ rows, loading, layers, onLayersChange }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const geojson = useMemo(() => toFeatureCollection(rows), [rows]);
  const sinGeo = rows.length - geojson.features.length;
  // TEMP debug — borrar después del diagnóstico
  console.log('[MapView] rows.length:', rows.length, '| geojson.features.length:', geojson.features.length);

  // ---------- init ----------
  useEffect(() => {
    if (!container.current || map.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        bounds: INITIAL_BOUNDS,
        fitBoundsOptions: { padding: 30 },
        attributionControl: { compact: true },
        maxZoom: 16,
      });
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'No se pudo inicializar el mapa');
      return;
    }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    m.getCanvas().setAttribute('tabindex', '0');
    m.getCanvas().setAttribute('aria-label', 'Mapa de dispersión geográfica de la dotación');

    m.on('load', () => {
      // fuente de empleados con clustering nativo (no renderiza nodos React)
      m.addSource(SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 55,
        clusterMaxZoom: 13,
      });

      // límites administrativos sin API key
      m.addSource(SRC_ADMIN0, {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
      });
      m.addSource(SRC_ADMIN1, {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson',
      });

      m.addLayer({
        id: 'admin1-line',
        type: 'line',
        source: SRC_ADMIN1,
        layout: { visibility: 'none' },
        paint: { 'line-color': '#3d5470', 'line-width': 0.7, 'line-opacity': 0.75 },
      });
      m.addLayer({
        id: 'admin0-line',
        type: 'line',
        source: SRC_ADMIN0,
        layout: { visibility: 'none' },
        paint: { 'line-color': '#6a8cb0', 'line-width': 1.2 },
      });

      m.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: SRC,
        maxzoom: 12,
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['case', ['has', 'point_count'], ['min', ['/', ['get', 'point_count'], 60], 1], 0.12],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 12, 2.4],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#123a5e',
            0.4, '#0f6fa8',
            0.6, '#00a9e0',
            0.8, '#7fd8ff',
            1, '#ffffff',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 14, 12, 34],
          'heatmap-opacity': 0.75,
        },
      });

      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#00a9e0', 100, '#3f8ee0', 500, '#7b4bd1', 2000, '#e0570a',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 15, 100, 21, 500, 28, 2000, 36],
          'circle-opacity': 0.86,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,.35)',
        },
      });
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SRC,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });

      m.addLayer({
        id: 'points',
        type: 'circle',
        source: SRC,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match', ['get', 'empresa'],
            'Personal', EMPRESA_COLOR.Personal,
            'TMA', EMPRESA_COLOR.TMA,
            'Personal Paraguay', EMPRESA_COLOR['Personal Paraguay'],
            '#8899aa',
          ],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 12, 6, 16, 9],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,.55)',
        },
      });

      // click en cluster => zoom / desagregación
      m.on('click', 'clusters', (e: MapMouseEvent) => {
        const f = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!f) return;
        const id = f.properties?.cluster_id as number;
        const src = m.getSource(SRC) as GeoJSONSource;
        src.getClusterExpansionZoom(id).then((zoom) => {
          const c = (f.geometry as Point).coordinates as [number, number];
          m.easeTo({ center: c, zoom: Math.min(zoom + 0.3, 15) });
        }).catch(() => undefined);
      });

      // click en punto => ficha del empleado sintético
      m.on('click', 'points', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const c = (f.geometry as Point).coordinates.slice() as [number, number];
        new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
          .setLngLat(c)
          .setHTML(fichaHtml(f.properties as Record<string, unknown>))
          .addTo(m);
      });

      for (const l of ['clusters', 'points']) {
        m.on('mouseenter', l, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', l, () => { m.getCanvas().style.cursor = ''; });
      }

      setReady(true);
    });

    m.on('error', (e) => {
      // los errores de tiles no deben tumbar el dashboard
      console.warn('map', e?.error?.message);
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // ---------- datos ----------
  useEffect(() => {
    if (!ready || !map.current) return;
    const src = map.current.getSource(SRC) as GeoJSONSource | undefined;
    if (src) src.setData(geojson);
  }, [geojson, ready]);

  // ---------- visibilidad de capas ----------
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;
    const set = (id: string, on: boolean) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    set('clusters', layers.clusters);
    set('cluster-count', layers.clusters);
    set('points', layers.puntos);
    set('heat', layers.heatmap);
    set('admin0-line', layers.paises);
    set('admin1-line', layers.subdivisiones);
  }, [layers, ready]);

  const fitToResults = useCallback(() => {
    if (!map.current || geojson.features.length === 0) return;
    const b = new maplibregl.LngLatBounds();
    for (const f of geojson.features) {
      b.extend((f.geometry as Point).coordinates as [number, number]);
    }
    map.current.fitBounds(b, { padding: 60, maxZoom: 12, duration: 600 });
  }, [geojson]);

  const resetView = useCallback(() => {
    map.current?.fitBounds(INITIAL_BOUNDS, { padding: 30, duration: 600 });
  }, []);

  const toggle = (k: keyof LayerToggles) =>
    onLayersChange({ ...layers, [k]: !layers[k] });

  return (
    <div className="map-wrap">
      <div className="map-canvas" ref={container} />

      <fieldset className="map-overlay map-layers">
        <legend className="overlay-title">Capas</legend>
        {(
          [
            ['clusters', 'Clusters'],
            ['puntos', 'Puntos'],
            ['heatmap', 'Mapa de calor'],
            ['paises', 'Límites de países'],
            ['subdivisiones', 'Provincias / regiones'],
          ] as [keyof LayerToggles, string][]
        ).map(([k, label]) => (
          <label className="layer-row" key={k}>
            <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <div className="map-overlay map-actions">
        <button className="btn sm" onClick={fitToResults} title="Ajustar el encuadre a los resultados filtrados">
          Ajustar a resultados
        </button>
        <button className="btn sm" onClick={resetView} title="Volver al encuadre inicial">
          Reset de vista
        </button>
      </div>

      <div className="map-overlay map-legend">
        <div className="overlay-title">Referencias</div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: EMPRESA_COLOR.Personal }} /> Personal
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: EMPRESA_COLOR.TMA }} /> TMA
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: EMPRESA_COLOR['Personal Paraguay'] }} /> Personal Paraguay
        </div>
        <div className="legend-row">
          <span className="legend-dot hollow" /> {fmtNum(sinGeo)} sin geolocalizar (no se dibujan)
        </div>
      </div>

      {(loading || mapError || (!loading && rows.length === 0)) && (
        <div className="map-status" role="status" aria-live="polite">
          <div>
            {loading && (
              <>
                <div className="spinner" />
                <strong>Generando dotación…</strong>
                <div style={{ color: 'var(--fg-muted)', marginTop: 4 }}>
                  Procesando snapshots en segundo plano
                </div>
              </>
            )}
            {mapError && (
              <>
                <strong style={{ color: 'var(--err)' }}>No se pudo cargar el mapa</strong>
                <div style={{ color: 'var(--fg-muted)', marginTop: 4 }}>{mapError}</div>
              </>
            )}
            {!loading && !mapError && rows.length === 0 && (
              <>
                <strong>Sin resultados</strong>
                <div style={{ color: 'var(--fg-muted)', marginTop: 4 }}>
                  Ningún empleado coincide con los filtros activos.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
