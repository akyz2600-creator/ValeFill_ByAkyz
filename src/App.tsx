import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DraftRecord, Notice, View, VoucherData, VoucherRecord } from './types';
import { applyPatch, emptyVoucher, fileBase, isBlank, newId, normalizeVoucher, todayISO } from './lib/defaults';
import { DEFAULT_LAYOUT, mergeLayout } from './lib/layout';
import type { LayoutConfig } from './lib/layout';
import { validateVoucher } from './lib/validate';
import { deleteVoucher, getMeta, listVouchers, putVoucher, setMeta } from './lib/db';
import { drawVoucher } from './lib/render';
import { buildExport, downloadFile, shareFile } from './lib/exporter';
import type { ExportFormat } from './lib/exporter';
import { useTemplate } from './hooks/useTemplate';
import { FormPanel } from './components/FormPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { CalibratePanel } from './components/CalibratePanel';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';

const NAV: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'form', label: 'Formulario', icon: 'edit' },
  { id: 'preview', label: 'Vista previa', icon: 'eye' },
  { id: 'history', label: 'Historial', icon: 'history' },
  { id: 'calibrate', label: 'Calibrar', icon: 'tune' },
];

export default function App() {
  const { img, error: tplError } = useTemplate();
  const [view, setView] = useState<View>('form');
  const [data, setData] = useState<VoucherData>(() => emptyVoucher());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [busy, setBusy] = useState(false);

  const lastSaved = useRef('');
  const noticeTimer = useRef<number | undefined>(undefined);
  const latest = useRef({ data, editingId, layout, ready });
  latest.current = { data, editingId, layout, ready };

  const issues = useMemo(() => validateVoucher(data), [data]);

  const notify = useCallback((type: Notice['type'], text: string) => {
    setNotice({ type, text });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), type === 'error' ? 7000 : 3500);
  }, []);

  // Carga inicial: borrador, calibración e historial guardados en el dispositivo.
  useEffect(() => {
    (async () => {
      try {
        const [draft, savedLayout, list] = await Promise.all([
          getMeta<DraftRecord>('draft'),
          getMeta<Partial<LayoutConfig>>('layout'),
          listVouchers(),
        ]);
        if (savedLayout) setLayout(mergeLayout(savedLayout));
        setVouchers(list);
        if (draft && draft.data) {
          const restored = normalizeVoucher(draft.data);
          setData(restored);
          setEditingId(draft.editingId ?? null);
          const rec = draft.editingId ? list.find((v) => v.id === draft.editingId) : undefined;
          lastSaved.current = rec ? JSON.stringify(rec.data) : '';
        }
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(() => undefined);
        }
      } catch (e) {
        console.error(e);
        notify('error', 'No se pudo abrir el almacenamiento local: los borradores no se guardarán.');
      }
      setReady(true);
    })();
  }, [notify]);

  // Guardado automático del borrador.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      const rec: DraftRecord = { data, editingId, savedAt: Date.now() };
      setMeta('draft', rec).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(t);
  }, [data, editingId, ready]);

  // Guardado automático de la calibración.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      setMeta('layout', layout).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(t);
  }, [layout, ready]);

  // Al pasar la app a segundo plano, guardar de inmediato (Android puede cerrarla).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== 'hidden' || !latest.current.ready) return;
      const rec: DraftRecord = { data: latest.current.data, editingId: latest.current.editingId, savedAt: Date.now() };
      setMeta('draft', rec).catch(() => undefined);
      setMeta('layout', latest.current.layout).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const onChange = useCallback((patch: Partial<VoucherData>) => {
    setData((prev) => applyPatch(prev, patch));
  }, []);

  const refreshList = async () => {
    setVouchers(await listVouchers());
  };

  /** Guarda (o actualiza) el comprobante actual en el historial. */
  const saveToHistory = async (): Promise<void> => {
    const now = Date.now();
    const id = editingId ?? newId();
    const existing = vouchers.find((v) => v.id === id);
    const rec: VoucherRecord = {
      id,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      data,
    };
    await putVoucher(rec);
    lastSaved.current = JSON.stringify(data);
    setEditingId(id);
    await refreshList();
  };

  const isDirty = () => !isBlank(data) && JSON.stringify(data) !== lastSaved.current;

  const handleSave = async () => {
    if (isBlank(data)) {
      notify('info', 'No hay nada que guardar todavía.');
      return;
    }
    try {
      await saveToHistory();
      notify('ok', 'Guardado en el historial.');
    } catch (e) {
      console.error(e);
      notify('error', 'No se pudo guardar en el historial.');
    }
  };

  const handleNew = async () => {
    try {
      let saved = false;
      if (isDirty()) {
        await saveToHistory();
        saved = true;
      }
      setData(emptyVoucher());
      setEditingId(null);
      lastSaved.current = '';
      setView('form');
      notify('ok', saved ? 'Comprobante anterior guardado en el historial. Nuevo comprobante listo.' : 'Nuevo comprobante.');
    } catch (e) {
      console.error(e);
      notify('error', 'No se pudo guardar el comprobante actual; no se creó uno nuevo.');
    }
  };

  const handleEdit = async (rec: VoucherRecord) => {
    try {
      if (rec.id !== editingId && isDirty()) await saveToHistory();
      setData(normalizeVoucher(rec.data));
      setEditingId(rec.id);
      lastSaved.current = JSON.stringify(rec.data);
      setView('form');
      notify('info', 'Comprobante cargado para edición.');
    } catch (e) {
      console.error(e);
      notify('error', 'No se pudo abrir el comprobante.');
    }
  };

  const handleDuplicate = async (rec: VoucherRecord) => {
    try {
      const now = Date.now();
      const copy: VoucherRecord = {
        id: newId(),
        createdAt: now,
        updatedAt: now,
        data: { ...rec.data, fecha: todayISO(), cargos: rec.data.cargos.map((r) => ({ ...r, id: newId() })) },
      };
      await putVoucher(copy);
      await refreshList();
      notify('ok', 'Comprobante duplicado (con la fecha de hoy).');
    } catch (e) {
      console.error(e);
      notify('error', 'No se pudo duplicar.');
    }
  };

  const handleDelete = async (rec: VoucherRecord) => {
    if (!window.confirm('¿Eliminar este comprobante del historial? Esta acción no se puede deshacer.')) return;
    try {
      await deleteVoucher(rec.id);
      if (rec.id === editingId) {
        setEditingId(null);
        lastSaved.current = '';
      }
      await refreshList();
      notify('ok', 'Comprobante eliminado.');
    } catch (e) {
      console.error(e);
      notify('error', 'No se pudo eliminar.');
    }
  };

  const handleExport = async (action: 'download' | 'share') => {
    if (!img) {
      notify('error', tplError ?? 'La plantilla aún no está cargada.');
      return;
    }
    const errors = issues.filter((i) => i.level === 'error');
    if (errors.length > 0) {
      notify('error', 'Corrige antes de exportar: ' + errors.map((i) => i.message).join(' · '));
      setView('form');
      return;
    }
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      drawVoucher(canvas, img, data, layout, { maxSide: 3200 });
      const file = await buildExport(canvas, format, fileBase(data));
      const msg = action === 'share' ? await shareFile(file) : await downloadFile(file);
      try {
        await saveToHistory();
      } catch (e) {
        console.error(e);
      }
      notify('ok', msg);
    } catch (e) {
      console.error(e);
      notify('error', 'No se pudo exportar: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const showWorkspace = view === 'form' || view === 'preview';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 128 128" width="34" height="34" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="#1e5bff" />
            <path d="M30 34h20l14 40 14-40h20L74 100H54z" fill="#ffffff" />
          </svg>
          <div className="brand-text">
            <strong>ValeFill</strong>
            <span>By Akyz</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn ghost" onClick={handleNew}>
            <Icon name="newdoc" /> Nuevo
          </button>
          <button type="button" className="btn light" onClick={handleSave}>
            <Icon name="save" /> Guardar
          </button>
        </div>
      </header>

      {notice && (
        <div className={`toast ${notice.type}`} role="status" onClick={() => setNotice(null)}>
          {notice.text}
        </div>
      )}

      <main className="content">
        {showWorkspace && (
          <div className="workspace" data-view={view}>
            <div className="pane pane-form">
              <FormPanel data={data} issues={issues} warnings={warnings} onChange={onChange} />
            </div>
            <div className="pane pane-preview">
              <div className="panel">
                <PreviewPanel
                  img={img}
                  error={tplError}
                  data={data}
                  layout={layout}
                  onReport={setWarnings}
                />
                {warnings.length > 0 && (
                  <div className="callout warn" role="status">
                    <strong>Avisos de ajuste</strong>
                    {warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                )}
                <section className="card export">
                  <h2>Exportar</h2>
                  <div className="segmented" role="radiogroup" aria-label="Formato">
                    {(['png', 'jpeg', 'pdf'] as ExportFormat[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        role="radio"
                        aria-checked={format === f}
                        className={format === f ? 'on' : ''}
                        onClick={() => setFormat(f)}
                      >
                        {f === 'jpeg' ? 'JPEG' : f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="btn-row">
                    <button type="button" className="btn primary" disabled={busy} onClick={() => handleExport('download')}>
                      <Icon name="download" /> {busy ? 'Procesando…' : 'Descargar'}
                    </button>
                    <button type="button" className="btn primary" disabled={busy} onClick={() => handleExport('share')}>
                      <Icon name="share" /> Compartir
                    </button>
                  </div>
                  <p className="muted small-text">Al exportar, el comprobante también se guarda en el historial.</p>
                </section>
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <HistoryPanel
            items={vouchers}
            editingId={editingId}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}

        {view === 'calibrate' && (
          <CalibratePanel img={img} error={tplError} data={data} layout={layout} onLayout={setLayout} notify={notify} />
        )}
      </main>

      <nav className="bottomnav" aria-label="Secciones">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={view === n.id ? 'on' : ''}
            aria-current={view === n.id ? 'page' : undefined}
            onClick={() => setView(n.id)}
          >
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
