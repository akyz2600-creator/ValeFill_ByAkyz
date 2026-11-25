import type { VoucherData } from '../types.ts';
import { COL_KEYS, FIELD_KEYS, FIELD_LABELS } from './layout.ts';
import type { LayoutConfig, TextBox } from './layout.ts';
import { formatMonto, parseMonto } from './money.ts';
import { formatFecha } from './defaults.ts';

const FONT = 'Arial, Helvetica, sans-serif';
const INK = '#0b1b4d';

export interface RenderOptions {
  /** Lado máximo del canvas en píxeles (la imagen se reduce proporcionalmente si lo supera). */
  maxSide?: number;
  /** Dibuja las cajas de cada campo (modo calibración). */
  showBoxes?: boolean;
  /** Campo resaltado en modo calibración: clave de campo, 'table' o 'col:<columna>'. */
  selected?: string | null;
}

export interface RenderResult {
  width: number;
  height: number;
  warnings: string[];
}

interface FitResult {
  lines: string[];
  size: number;
  fits: boolean;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = line + ' ' + words[i];
      if (ctx.measureText(test).width <= maxW) {
        line = test;
      } else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}

/** Busca el mayor tamaño de letra (<= sizePx) con el que el texto cabe; no baja de minPx. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxW: number,
  boxH: number,
  maxLines: number,
  sizePx: number,
  minPx: number,
): FitResult {
  let s = sizePx;
  for (let guard = 0; guard < 200; guard++) {
    if (s < minPx) s = minPx;
    ctx.font = `${s}px ${FONT}`;
    const lines = wrapText(ctx, text, boxW);
    const lineH = s * 1.15;
    const ok =
      lines.length <= maxLines &&
      lines.length * lineH <= boxH * 1.02 &&
      lines.every((l) => ctx.measureText(l).width <= boxW + 0.5);
    if (ok) return { lines, size: s, fits: true };
    if (s <= minPx) return { lines, size: s, fits: false };
    s *= 0.94;
  }
  ctx.font = `${minPx}px ${FONT}`;
  return { lines: wrapText(ctx, text, boxW), size: minPx, fits: false };
}

function ellipsize(ctx: CanvasRenderingContext2D, line: string, maxW: number, force: boolean): string {
  if (!force && ctx.measureText(line).width <= maxW) return line;
  let s = line;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

function drawTextBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: TextBox,
  W: number,
  H: number,
  minPx: number,
  label: string,
  warnings: Set<string>,
): void {
  const t = text.trim();
  if (!t) return;
  const bx = box.x * W;
  const by = box.y * H;
  const bw = box.w * W;
  const bh = box.h * H;
  const fit = fitText(ctx, t, bw, bh, box.maxLines, box.size * H, minPx);
  if (!fit.fits) warnings.add(`«${label}» no cabe en su espacio: el texto se redujo o se recortó.`);

  ctx.save();
  if (!fit.fits) {
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();
  }
  ctx.font = `${fit.size}px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.textAlign = box.align;
  const ax = box.align === 'left' ? bx : box.align === 'center' ? bx + bw / 2 : bx + bw;
  const lineH = fit.size * 1.15;

  let lines = fit.lines;
  if (!fit.fits) {
    const truncated = lines.length > box.maxLines;
    lines = lines.slice(0, box.maxLines).map((l, i, arr) =>
      ellipsize(ctx, l, bw, truncated && i === arr.length - 1),
    );
  }

  if (box.maxLines === 1) {
    ctx.textBaseline = 'middle';
    ctx.fillText(lines[0] ?? '', ax, by + bh / 2);
  } else {
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, ax, by + i * lineH));
  }
  ctx.restore();
}

function drawBoxes(ctx: CanvasRenderingContext2D, layout: LayoutConfig, W: number, H: number, selected: string | null) {
  const lw = Math.max(2, W / 600);
  ctx.save();
  ctx.font = `${Math.max(12, H * 0.022)}px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  const stroke = (x: number, y: number, w: number, h: number, active: boolean, dash: boolean) => {
    ctx.setLineDash(dash ? [lw * 3, lw * 2] : []);
    ctx.lineWidth = active ? lw * 1.8 : lw;
    ctx.strokeStyle = active ? '#ff3b30' : 'rgba(30, 91, 255, 0.9)';
    ctx.strokeRect(x, y, w, h);
  };
  for (const k of FIELD_KEYS) {
    const b = layout.fields[k];
    const active = selected === k;
    stroke(b.x * W, b.y * H, b.w * W, b.h * H, active, false);
    ctx.fillStyle = active ? '#ff3b30' : 'rgba(30, 91, 255, 0.95)';
    ctx.fillText(FIELD_LABELS[k], b.x * W + 3, b.y * H - 2);
  }
  const t = layout.table;
  stroke(t.x * W, t.y * H, t.w * W, t.h * H, selected === 'table', false);
  ctx.fillStyle = selected === 'table' ? '#ff3b30' : 'rgba(30, 91, 255, 0.95)';
  ctx.fillText('Cárguese a', t.x * W + 3, t.y * H - 2);
  for (const k of COL_KEYS) {
    const c = t.cols[k];
    stroke(c.x * W, t.y * H, c.w * W, t.h * H, selected === `col:${k}`, true);
  }
  ctx.restore();
}

export function drawVoucher(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  data: VoucherData,
  layout: LayoutConfig,
  opts: RenderOptions = {},
): RenderResult {
  const maxSide = opts.maxSide ?? 3200;
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSide / Math.max(nw, nh));
  const W = Math.max(1, Math.round(nw * scale));
  const H = Math.max(1, Math.round(nh * scale));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible en este dispositivo.');

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const warnings = new Set<string>();
  const minPx = layout.minSize * H;
  const f = layout.fields;

  // Encabezado
  const cents = parseMonto(data.importeNumero);
  const importeTxt = cents !== null ? formatMonto(cents) : data.importeNumero.trim();
  if (importeTxt) {
    drawTextBox(ctx, layout.dollarPrefix ? `$ ${importeTxt}` : importeTxt, f.importeNumero, W, H, minPx, FIELD_LABELS.importeNumero, warnings);
  }
  drawTextBox(ctx, data.importeLetra, f.importeLetra, W, H, minPx, FIELD_LABELS.importeLetra, warnings);
  drawTextBox(ctx, data.concepto, f.concepto, W, H, minPx, FIELD_LABELS.concepto, warnings);

  // Cárguese a: filas dinámicas repartidas en el espacio disponible
  const filas = data.cargos.filter((r) => r.cuenta.trim() || r.nombre.trim() || r.importe.trim());
  if (filas.length > 0) {
    const t = layout.table;
    const n = filas.length;
    const rowH = Math.min(t.maxRowH * H, (t.h * H) / n);
    const sizePx = Math.min(t.size * H, rowH * 0.72);
    if (sizePx < minPx) {
      warnings.add(
        `Hay ${n} filas en «Cárguese a» y no caben bien en el espacio disponible: el texto queda muy pequeño o encimado.`,
      );
    }
    filas.forEach((r, i) => {
      const y = (t.y * H + i * rowH) / H;
      const c = r.importe.trim() ? parseMonto(r.importe) : null;
      const imp = c !== null ? formatMonto(c) : r.importe.trim();
      const cells: Array<[string, (typeof COL_KEYS)[number]]> = [
        [r.cuenta, 'cuenta'],
        [r.nombre, 'nombre'],
        [imp, 'importe'],
      ];
      for (const [text, k] of cells) {
        const col = t.cols[k];
        const box: TextBox = {
          x: col.x,
          y,
          w: col.w,
          h: rowH / H,
          align: col.align,
          size: sizePx / H,
          maxLines: 1,
        };
        drawTextBox(ctx, text, box, W, H, minPx, 'Cárguese a', warnings);
      }
    });
  }

  // Control
  drawTextBox(ctx, formatFecha(data.fecha), f.fecha, W, H, minPx, FIELD_LABELS.fecha, warnings);
  drawTextBox(ctx, data.autorizadoPor, f.autorizadoPor, W, H, minPx, FIELD_LABELS.autorizadoPor, warnings);
  drawTextBox(ctx, data.recibidoPor, f.recibidoPor, W, H, minPx, FIELD_LABELS.recibidoPor, warnings);

  if (opts.showBoxes) drawBoxes(ctx, layout, W, H, opts.selected ?? null);

  return { width: W, height: H, warnings: Array.from(warnings) };
}
