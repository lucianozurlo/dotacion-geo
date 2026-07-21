import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// MapLibre y los Workers no existen en jsdom: se sustituyen por dobles.
vi.mock('maplibre-gl', () => {
  class FakeMap {
    on() { return this; }
    addControl() { return this; }
    addSource() {}
    addLayer() {}
    getLayer() { return null; }
    getSource() { return undefined; }
    setLayoutProperty() {}
    fitBounds() {}
    easeTo() {}
    remove() {}
    queryRenderedFeatures() { return []; }
    getCanvas() {
      return { setAttribute() {}, style: {} } as unknown as HTMLCanvasElement;
    }
  }
  class FakeBounds { extend() { return this; } }
  return {
    default: {
      Map: FakeMap,
      NavigationControl: class {},
      ScaleControl: class {},
      Popup: class { setLngLat() { return this; } setHTML() { return this; } addTo() { return this; } },
      LngLatBounds: FakeBounds,
    },
    Map: FakeMap,
  };
});
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

beforeAll(() => {
  class FakeWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;
    postMessage() { /* nunca responde: el test valida el estado de carga */ }
    terminate() {}
  }
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x' }));
});

import App from '../App';

describe('dashboard', () => {
  it('renderiza el header, la fecha de última dotación y los KPIs', async () => {
    render(<App />);
    expect(screen.getByText('Dotación Geo')).toBeInTheDocument();
    expect(screen.getByText('21 de julio de 2026')).toBeInTheDocument();
    expect(screen.getByText('Dotación visible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importar snapshot/i })).toBeInTheDocument();
  });

  it('muestra el estado de carga mientras se generan los datos', () => {
    render(<App />);
    expect(screen.getAllByText(/Generando dotación/i).length).toBeGreaterThan(0);
  });

  it('expone los paneles de filtros e insights con labels accesibles', () => {
    render(<App />);
    expect(screen.getAllByLabelText('Filtros').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Panel de insights').length).toBeGreaterThan(0);
  });

  it('incluye el enlace de salto al mapa para navegación por teclado', () => {
    render(<App />);
    expect(screen.getAllByText('Saltar al mapa')[0]).toHaveAttribute('href', '#mapa');
  });
});
