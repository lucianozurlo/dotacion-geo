import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SEED } from '../domain/generator';
import { loadAllImported, saveSnapshot } from '../domain/storage';
import {
  LATEST_DATE, type Employee, type Snapshot, type SnapshotData,
} from '../domain/types';
import {
  applyFilters, compareSnapshots, emptyFilters, type FilterState,
} from '../domain/filters';
import { decodeFilters, encodeFilters } from './urlState';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DatasetApi {
  status: LoadStatus;
  error: string | null;
  snapshots: Snapshot[];
  fechas: string[];
  filters: FilterState;
  setFilters: (updater: (f: FilterState) => FilterState) => void;
  resetFilters: () => void;
  /** filas del snapshot seleccionado (todas las empresas) antes de filtrar */
  baseRows: Employee[];
  /** filas resultantes tras aplicar filtros */
  rows: Employee[];
  comparison: ReturnType<typeof compareSnapshots> | null;
  addSnapshot: (data: SnapshotData) => Promise<void>;
  reloadImported: () => Promise<void>;
  seed: number;
  setSeed: (s: number) => void;
}

export function useDataset(): DatasetApi {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(DEFAULT_SEED);
  const [byId, setById] = useState<Map<string, SnapshotData>>(new Map());
  const [filters, setFiltersRaw] = useState<FilterState>(() => {
    const fromUrl = decodeFilters(window.location.hash);
    return fromUrl ?? emptyFilters(LATEST_DATE);
  });
  const workerRef = useRef<Worker | null>(null);

  // --- carga inicial: genera sintéticos en worker + recupera importados ---
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    const worker = new Worker(new URL('../workers/dataWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = async (ev: MessageEvent) => {
      if (cancelled) return;
      const msg = ev.data;
      if (msg.type === 'generated') {
        const map = new Map<string, SnapshotData>();
        for (const d of msg.data as SnapshotData[]) map.set(d.snapshot.id, d);
        try {
          for (const d of await loadAllImported()) map.set(d.snapshot.id, d);
        } catch {
          /* IndexedDB no disponible: seguimos sólo con sintéticos */
        }
        if (cancelled) return;
        setById(map);
        setStatus('ready');
      } else if (msg.type === 'error') {
        setError(msg.message);
        setStatus('error');
      }
    };
    worker.onerror = (e) => {
      setError(e.message || 'Error en el worker de datos');
      setStatus('error');
    };
    worker.postMessage({ type: 'generate', seed });

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [seed]);

  const snapshots = useMemo(
    () => [...byId.values()].map((d) => d.snapshot).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [byId],
  );

  const fechas = useMemo(
    () => [...new Set(snapshots.map((s) => s.fecha))].sort(),
    [snapshots],
  );

  const rowsForDate = useCallback(
    (fecha: string | null): Employee[] => {
      if (!fecha) return [];
      const out: Employee[] = [];
      for (const d of byId.values()) if (d.snapshot.fecha === fecha) out.push(...d.rows);
      return out;
    },
    [byId],
  );

  const baseRows = useMemo(() => rowsForDate(filters.fecha), [rowsForDate, filters.fecha]);
  const rows = useMemo(() => applyFilters(baseRows, filters), [baseRows, filters]);

  const prevRows = useMemo(
    () => rowsForDate(filters.fechaComparacion),
    [rowsForDate, filters.fechaComparacion],
  );

  const comparison = useMemo(() => {
    if (!filters.fechaComparacion) return null;
    const prevFiltered = applyFilters(prevRows, { ...filters, fecha: filters.fechaComparacion });
    return compareSnapshots(rows, prevFiltered);
  }, [filters, prevRows, rows]);

  const setFilters = useCallback((updater: (f: FilterState) => FilterState) => {
    setFiltersRaw((prev) => updater(prev));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersRaw((prev) => ({ ...emptyFilters(prev.fecha), fecha: prev.fecha }));
  }, []);

  // persistencia de filtros en la URL
  useEffect(() => {
    const h = encodeFilters(filters);
    if (window.location.hash !== h) {
      window.history.replaceState(null, '', h || window.location.pathname);
    }
  }, [filters]);

  const addSnapshot = useCallback(async (data: SnapshotData) => {
    await saveSnapshot(data);
    setById((prev) => {
      const next = new Map(prev);
      next.set(data.snapshot.id, data);
      return next;
    });
  }, []);

  const reloadImported = useCallback(async () => {
    const imported = await loadAllImported();
    setById((prev) => {
      const next = new Map<string, SnapshotData>();
      for (const [k, v] of prev) if (v.snapshot.origen === 'sintetico') next.set(k, v);
      for (const d of imported) next.set(d.snapshot.id, d);
      return next;
    });
  }, []);

  return {
    status, error, snapshots, fechas, filters, setFilters, resetFilters,
    baseRows, rows, comparison, addSnapshot, reloadImported, seed, setSeed,
  };
}
