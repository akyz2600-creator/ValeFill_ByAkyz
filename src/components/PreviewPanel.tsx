import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import type { VoucherData } from '../types';
import type { LayoutConfig } from '../lib/layout';
import { drawVoucher } from '../lib/render';

interface Props {
  img: HTMLImageElement | null;
  error: string | null;
  data: VoucherData;
  layout: LayoutConfig;
  showBoxes?: boolean;
  selected?: string | null;
  /** Si se define, tocar la vista previa devuelve la posición relativa (0..1) tocada. */
  onPick?: (nx: number, ny: number) => void;
  onReport?: (warnings: string[]) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}

function touchDist(e: ReactTouchEvent<HTMLDivElement>): number {
  const a = e.touches[0];
  const b = e.touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function PreviewPanel({ img, error, data, layout, showBoxes, selected, onPick, onReport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const lastReport = useRef('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    try {
      const res = drawVoucher(canvas, img, data, layout, {
        maxSide: 2400,
        showBoxes: !!showBoxes,
        selected: selected ?? null,
      });
      const key = res.warnings.join('|');
      if (key !== lastReport.current) {
        lastReport.current = key;
        onReport?.(res.warnings);
      }
    } catch (e) {
      console.error(e);
    }
  }, [img, data, layout, showBoxes, selected]);

  const handleClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    onPick(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
  };

  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) pinch.current = { d: touchDist(e), z: zoom };
  };
  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (pinch.current && e.touches.length === 2) {
      const d = touchDist(e);
      if (pinch.current.d > 0) setZoom(clamp((pinch.current.z * d) / pinch.current.d, MIN_ZOOM, MAX_ZOOM));
    }
  };
  const onTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) pinch.current = null;
  };

  return (
    <div className="preview">
      <div className="zoom-bar">
        <button type="button" className="icon-btn" aria-label="Alejar" onClick={() => setZoom((z) => clamp(z - 0.5, MIN_ZOOM, MAX_ZOOM))}>
          −
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={zoom}
          aria-label="Zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <button type="button" className="icon-btn" aria-label="Acercar" onClick={() => setZoom((z) => clamp(z + 0.5, MIN_ZOOM, MAX_ZOOM))}>
          +
        </button>
        <button type="button" className="btn secondary small" onClick={() => setZoom(1)}>
          Ajustar
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
      </div>

      {error ? (
        <div className="callout error" role="alert">
          <strong>Falta la plantilla</strong>
          <p>{error}</p>
        </div>
      ) : !img ? (
        <p className="muted center">Cargando plantilla…</p>
      ) : (
        <div
          className="canvas-wrap"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <canvas
            ref={canvasRef}
            className={onPick ? 'pickable' : ''}
            style={{ width: `${zoom * 100}%` }}
            onClick={handleClick}
          />
        </div>
      )}
    </div>
  );
}
