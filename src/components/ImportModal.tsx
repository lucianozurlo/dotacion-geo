import { useEffect, useRef, useState } from 'react';
import { errorsToCsv, normalizeFecha, type ParseResult } from '../domain/parser';
import {
  EMPRESAS, fmtFechaCorta, snapshotId,
  type Empresa, type Snapshot, type SnapshotData,
} from '../domain/types';
import {
  clearAll, deleteSnapshot, downloadBlob, exportSnapshotJson, loadRows,
} from '../domain/storage';
import { fmtNum } from '../domain/filters';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (data: SnapshotData) => Promise<void>;
  onReload: () => Promise<void>;
  snapshots: Snapshot[];
}

type Stage = 'form' | 'parsing' | 'preview' | 'done' | 'error';

export default function ImportModal({ open, onClose, onImport, onReload, snapshots }: Props) {
  const [empresa, setEmpresa] = useState<Empresa>('Personal');
  const [fechaTxt, setFechaTxt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('form');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  if (!open) return null;

  const fechaIso = normalizeFecha(fechaTxt);
  const canParse = !!file && !!fechaIso;
  const existingId = fechaIso ? snapshotId(fechaIso, empresa) : '';
  const overwrite = snapshots.some((s) => s.id === existingId);

  const doParse = async () => {
    if (!file || !fechaIso) return;
    setStage('parsing');
    setMsg(null);
    let text: string;
    try {
      // el extract suele venir en UTF-8; si trae bytes inválidos, se reintenta latin1
      const buf = await file.arrayBuffer();
      text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      if (text.includes('\uFFFD')) {
        text = new TextDecoder('windows-1252').decode(buf);
      }
    } catch (e) {
      setStage('error');
      setMsg(e instanceof Error ? e.message : 'No se pudo leer el archivo');
      return;
    }

    const w = new Worker(new URL('../workers/dataWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    w.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'parsed') {
        setResult(m.result as ParseResult);
        setStage('preview');
      } else if (m.type === 'error') {
        setMsg(m.message);
        setStage('error');
      }
      w.terminate();
    };
    w.onerror = (e) => {
      setMsg(e.message || 'Error procesando el CSV');
      setStage('error');
      w.terminate();
    };
    w.postMessage({ type: 'parse', text, opts: { empresa, fecha: fechaIso } });
  };

  const confirm = async () => {
    if (!result || !fechaIso) return;
    await onImport({
      snapshot: {
        id: snapshotId(fechaIso, empresa),
        fecha: fechaIso,
        empresa,
        origen: 'importado',
        total: result.rows.length,
        createdAt: Date.now(),
      },
      rows: result.rows,
    });
    setStage('done');
    setMsg(`Snapshot incorporado: ${fmtNum(result.rows.length)} registros.`);
  };

  const reset = () => {
    setStage('form');
    setResult(null);
    setMsg(null);
    setFile(null);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="imp-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2 id="imp-title">Importar snapshot desde CSV</h2>
          <button className="btn icon sm" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="modal-body">
          {stage === 'form' && (
            <>
              <p style={{ marginTop: 0, color: 'var(--fg-muted)', fontSize: 13 }}>
                El archivo debe estar separado por <code>;</code> y contener las 44 columnas
                originales del extract. Si trae coordenadas o localidad, se usan; si no,
                se aplica la tabla sociedad → zona y, en último caso, se marca
                <em> sin geolocalizar</em>.
              </p>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="imp-emp">Empresa</label>
                  <select
                    id="imp-emp"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value as Empresa)}
                  >
                    {EMPRESAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="imp-fecha">Fecha del snapshot (dd/mm/aaaa)</label>
                  <input
                    id="imp-fecha"
                    type="text"
                    placeholder="31/08/2026"
                    value={fechaTxt}
                    onChange={(e) => setFechaTxt(e.target.value)}
                    aria-invalid={!!fechaTxt && !fechaIso}
                  />
                  {fechaTxt && !fechaIso && (
                    <span style={{ color: 'var(--err)', fontSize: 11.5 }}>Fecha inválida</span>
                  )}
                </div>
              </div>
              <div className="field">
                <label htmlFor="imp-file">Archivo CSV</label>
                <input
                  id="imp-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {overwrite && (
                <div className="alert warn">
                  Ya existe un snapshot para {empresa} el {fmtFechaCorta(fechaIso!)}. Se reemplazará.
                </div>
              )}
            </>
          )}

          {stage === 'parsing' && (
            <div style={{ textAlign: 'center', padding: 26 }} role="status" aria-live="polite">
              <div className="spinner" />
              Validando y normalizando el archivo…
            </div>
          )}

          {stage === 'error' && <div className="alert err">{msg}</div>}

          {stage === 'preview' && result && (
            <>
              {result.headerMissing.length > 0 ? (
                <div className="alert err">
                  <strong>Encabezado inválido.</strong> Faltan {result.headerMissing.length} columnas
                  obligatorias: <span className="mono">{result.headerMissing.slice(0, 6).join(', ')}
                  {result.headerMissing.length > 6 ? '…' : ''}</span>
                </div>
              ) : (
                <div className="alert ok">
                  Encabezado válido: las 44 columnas originales están presentes.
                </div>
              )}
              {result.headerExtra.length > 0 && (
                <div className="alert warn">
                  Columnas adicionales detectadas (se conservan como derivadas si son geográficas):{' '}
                  <span className="mono">{result.headerExtra.join(', ')}</span>
                </div>
              )}

              <div className="grid-2" style={{ marginBottom: 10 }}>
                <div className="mov-card">
                  <span className="n">{fmtNum(result.rows.length)}</span>
                  <span className="l">Filas válidas</span>
                </div>
                <div className="mov-card">
                  <span className="n" style={{ color: result.errors.length ? 'var(--err)' : undefined }}>
                    {fmtNum(result.errors.length)}
                  </span>
                  <span className="l">Filas rechazadas</span>
                </div>
                <div className="mov-card">
                  <span className="n">{fmtNum(result.duplicados)}</span>
                  <span className="l">Legajos duplicados</span>
                </div>
                <div className="mov-card">
                  <span className="n" style={{ color: result.sinGeolocalizar ? 'var(--warn)' : undefined }}>
                    {fmtNum(result.sinGeolocalizar)}
                  </span>
                  <span className="l">Sin geolocalizar</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <button
                  className="btn sm"
                  onClick={() =>
                    downloadBlob(
                      new Blob([errorsToCsv(result.errors)], { type: 'text/csv;charset=utf-8' }),
                      `errores_${empresa}_${fechaIso}.csv`,
                    )
                  }
                >
                  Descargar errores ({result.errors.length})
                </button>
              )}

              {result.rows.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, marginBottom: 0, marginTop: 14 }}>
                    Vista previa (5 primeras filas)
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Legajo</th><th>Nombre</th><th>País</th>
                          <th>Sociedad</th><th>Localidad (derivado)</th><th>Precisión (derivado)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, 5).map((r) => (
                          <tr key={r.Legajo}>
                            <td>{r.Legajo}</td>
                            <td>{r.Nombre} {r.Apellidos}</td>
                            <td>{r['País']}</td>
                            <td>{r.Sociedad}</td>
                            <td>{r._geo_localidad || '—'}</td>
                            <td>{r._geo_precision}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {stage === 'done' && <div className="alert ok">{msg}</div>}

          <h3 style={{ fontSize: 13, marginTop: 20, marginBottom: 4 }}>Snapshots cargados</h3>
          {snapshots.map((s) => (
            <div className="snap-row" key={s.id}>
              <span className={`tag ${s.origen === 'importado' ? 'imp' : ''}`}>
                {s.origen === 'importado' ? 'Importado' : 'Sintético'}
              </span>
              <span className="grow">
                {fmtFechaCorta(s.fecha)} · {s.empresa} · {fmtNum(s.total)}
              </span>
              {s.origen === 'importado' && (
                <>
                  <button
                    className="btn sm"
                    onClick={async () => {
                      downloadBlob(
                        exportSnapshotJson({ snapshot: s, rows: await loadRows(s.id) }),
                        `${s.empresa}_${s.fecha}.json`,
                      );
                    }}
                  >
                    Exportar
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={async () => { await deleteSnapshot(s.id); await onReload(); }}
                  >
                    Borrar
                  </button>
                </>
              )}
            </div>
          ))}
          {snapshots.some((s) => s.origen === 'importado') && (
            <button
              className="btn sm danger"
              style={{ marginTop: 10 }}
              onClick={async () => { await clearAll(); await onReload(); }}
            >
              Borrar todos los importados
            </button>
          )}
        </div>

        <div className="modal-foot">
          {stage === 'preview' && <button className="btn" onClick={reset}>Volver</button>}
          {stage === 'form' && (
            <button className="btn primary" onClick={doParse} disabled={!canParse}>
              Validar archivo
            </button>
          )}
          {stage === 'preview' && (
            <button
              className="btn primary"
              onClick={confirm}
              disabled={!result || result.rows.length === 0 || result.headerMissing.length > 0}
            >
              Confirmar e incorporar
            </button>
          )}
          {(stage === 'done' || stage === 'error') && (
            <button className="btn" onClick={reset}>Importar otro</button>
          )}
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
