import { useState } from 'react';
import type { VoucherData } from '../types';
import { COL_KEYS, COL_LABELS, DEFAULT_LAYOUT, FIELD_KEYS, FIELD_LABELS, mergeLayout } from '../lib/layout';
import type { Align, ColKey, FieldKey, LayoutConfig, TextBox } from '../lib/layout';
import { sampleVoucher } from '../lib/defaults';
import { PreviewPanel } from './PreviewPanel';

interface Props {
  img: HTMLImageElement | null;
  error: string | null;
  data: VoucherData;
  layout: LayoutConfig;
  onLayout: (l: LayoutConfig) => void;
  notify: (type: 'ok' | 'error' | 'info', text: string) => void;
}

type Target = FieldKey | 'table' | `col:${ColKey}`;

const TARGETS: Array<{ id: Target; label: string }> = [
  ...FIELD_KEYS.map((k) => ({ id: k as Target, label: FIELD_LABELS[k] })),
  { id: 'table' as Target, label: 'Cárguese a (área de filas)' },
  ...COL_KEYS.map((k) => ({ id: `col:${k}` as Target, label: `Columna: ${COL_LABELS[k]}` })),
];

function isField(t: Target): t is FieldKey {
  return (FIELD_KEYS as string[]).includes(t);
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt?: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, fmt, onChange }: SliderProps) {
  const clampV = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <div className="slider">
      <div className="slider-head">
        <span>{label}</span>
        <strong>{(fmt ?? pct)(value)}</strong>
      </div>
      <div className="slider-row">
        <button type="button" className="icon-btn" aria-label={`${label} menos`} onClick={() => onChange(clampV(value - step))}>
          −
        </button>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <button type="button" className="icon-btn" aria-label={`${label} más`} onClick={() => onChange(clampV(value + step))}>
          +
        </button>
      </div>
    </div>
  );
}

function AlignSelect({ value, onChange }: { value: Align; onChange: (a: Align) => void }) {
  return (
    <>
      <label htmlFor="align">Alineación</label>
      <select id="align" value={value} onChange={(e) => onChange(e.target.value as Align)}>
        <option value="left">Izquierda</option>
        <option value="center">Centro</option>
        <option value="right">Derecha</option>
      </select>
    </>
  );
}

export function CalibratePanel({ img, error, data, layout, onLayout, notify }: Props) {
  const [target, setTarget] = useState<Target>('importeNumero');
  const [useSample, setUseSample] = useState(true);

  const patchField = (k: FieldKey, patch: Partial<TextBox>) =>
    onLayout({ ...layout, fields: { ...layout.fields, [k]: { ...layout.fields[k], ...patch } } });
  const patchTable = (patch: Partial<LayoutConfig['table']>) => onLayout({ ...layout, table: { ...layout.table, ...patch } });
  const patchCol = (k: ColKey, patch: Partial<LayoutConfig['table']['cols'][ColKey]>) =>
    onLayout({
      ...layout,
      table: { ...layout.table, cols: { ...layout.table.cols, [k]: { ...layout.table.cols[k], ...patch } } },
    });

  const onPick = (nx: number, ny: number) => {
    const x = Math.round(nx * 1000) / 1000;
    const y = Math.round(ny * 1000) / 1000;
    if (isField(target)) patchField(target, { x, y });
    else if (target === 'table') patchTable({ x, y });
    else patchCol(target.slice(4) as ColKey, { x });
  };

  const copyJson = async () => {
    const json = JSON.stringify(layout, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      notify('ok', 'Ajustes copiados al portapapeles (JSON).');
    } catch {
      window.prompt('Copia este JSON de ajustes:', JSON.stringify(layout));
    }
  };

  const pasteJson = () => {
    const txt = window.prompt('Pega aquí el JSON de ajustes:');
    if (!txt) return;
    try {
      onLayout(mergeLayout(JSON.parse(txt)));
      notify('ok', 'Ajustes importados.');
    } catch {
      notify('error', 'El JSON no es válido.');
    }
  };

  const reset = () => {
    if (window.confirm('¿Restablecer todas las posiciones a los valores por defecto?')) {
      onLayout(DEFAULT_LAYOUT);
      notify('info', 'Posiciones restablecidas.');
    }
  };

  const previewData = useSample ? sampleVoucher() : data;

  return (
    <div className="panel calibrate">
      <div className="callout info">
        <strong>Calibración de posiciones</strong>
        <p>
          Elige un campo y toca la vista previa para mover su esquina superior izquierda; afina con los controles.
          Todo se guarda en el dispositivo y usa coordenadas relativas a la imagen.
        </p>
      </div>

      <PreviewPanel
        img={img}
        error={error}
        data={previewData}
        layout={layout}
        showBoxes
        selected={target}
        onPick={onPick}
      />

      <section className="card">
        <label className="check">
          <input type="checkbox" checked={useSample} onChange={(e) => setUseSample(e.target.checked)} />
          Usar datos de ejemplo
        </label>

        <label htmlFor="target">Campo a ajustar</label>
        <select id="target" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
          {TARGETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        {isField(target) && (
          <>
            <Slider label="Posición X" value={layout.fields[target].x} min={0} max={1} step={0.002} onChange={(v) => patchField(target, { x: v })} />
            <Slider label="Posición Y" value={layout.fields[target].y} min={0} max={1} step={0.002} onChange={(v) => patchField(target, { y: v })} />
            <Slider label="Ancho" value={layout.fields[target].w} min={0.02} max={1} step={0.002} onChange={(v) => patchField(target, { w: v })} />
            <Slider label="Alto" value={layout.fields[target].h} min={0.01} max={0.6} step={0.002} onChange={(v) => patchField(target, { h: v })} />
            <Slider label="Tamaño máx. de letra" value={layout.fields[target].size} min={0.01} max={0.12} step={0.001} onChange={(v) => patchField(target, { size: v })} />
            <Slider
              label="Líneas máximas"
              value={layout.fields[target].maxLines}
              min={1}
              max={6}
              step={1}
              fmt={(v) => String(v)}
              onChange={(v) => patchField(target, { maxLines: v })}
            />
            <AlignSelect value={layout.fields[target].align} onChange={(a) => patchField(target, { align: a })} />
          </>
        )}

        {target === 'table' && (
          <>
            <Slider label="Posición X" value={layout.table.x} min={0} max={1} step={0.002} onChange={(v) => patchTable({ x: v })} />
            <Slider label="Posición Y (inicio de filas)" value={layout.table.y} min={0} max={1} step={0.002} onChange={(v) => patchTable({ y: v })} />
            <Slider label="Ancho" value={layout.table.w} min={0.05} max={1} step={0.002} onChange={(v) => patchTable({ w: v })} />
            <Slider label="Alto disponible (todas las filas)" value={layout.table.h} min={0.02} max={0.8} step={0.002} onChange={(v) => patchTable({ h: v })} />
            <Slider label="Alto máx. por fila" value={layout.table.maxRowH} min={0.01} max={0.3} step={0.001} onChange={(v) => patchTable({ maxRowH: v })} />
            <Slider label="Tamaño máx. de letra" value={layout.table.size} min={0.01} max={0.12} step={0.001} onChange={(v) => patchTable({ size: v })} />
          </>
        )}

        {!isField(target) && target.startsWith('col:') && (
          <>
            <Slider
              label="Posición X"
              value={layout.table.cols[target.slice(4) as ColKey].x}
              min={0}
              max={1}
              step={0.002}
              onChange={(v) => patchCol(target.slice(4) as ColKey, { x: v })}
            />
            <Slider
              label="Ancho"
              value={layout.table.cols[target.slice(4) as ColKey].w}
              min={0.02}
              max={1}
              step={0.002}
              onChange={(v) => patchCol(target.slice(4) as ColKey, { w: v })}
            />
            <AlignSelect
              value={layout.table.cols[target.slice(4) as ColKey].align}
              onChange={(a) => patchCol(target.slice(4) as ColKey, { align: a })}
            />
          </>
        )}
      </section>

      <section className="card">
        <h2>Opciones generales</h2>
        <Slider
          label="Tamaño mínimo de letra (aviso)"
          value={layout.minSize}
          min={0.008}
          max={0.04}
          step={0.001}
          onChange={(v) => onLayout({ ...layout, minSize: v })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={layout.dollarPrefix}
            onChange={(e) => onLayout({ ...layout, dollarPrefix: e.target.checked })}
          />
          Dibujar el símbolo «$» junto al importe (desactívalo si la plantilla ya lo trae impreso)
        </label>
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={copyJson}>
            Copiar ajustes (JSON)
          </button>
          <button type="button" className="btn secondary" onClick={pasteJson}>
            Pegar ajustes
          </button>
          <button type="button" className="btn danger" onClick={reset}>
            Restablecer
          </button>
        </div>
      </section>
    </div>
  );
}
