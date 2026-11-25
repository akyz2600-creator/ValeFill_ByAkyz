import test from 'node:test';
import assert from 'node:assert/strict';
import { drawVoucher } from '../src/lib/render.ts';
import { DEFAULT_LAYOUT, mergeLayout } from '../src/lib/layout.ts';
import { newRow, sampleVoucher } from '../src/lib/defaults.ts';

// Canvas simulado: mide el texto como 0.5 * tamaño de letra por carácter y registra cada fillText.
interface Call {
  text: string;
  x: number;
  y: number;
  size: number;
  align: string;
  clipped: boolean;
}

function fakeCanvas() {
  const calls: Call[] = [];
  let size = 10;
  let clipped = false;
  let align = 'left';
  const ctx: any = {
    clearRect() {},
    drawImage() {},
    save() {},
    restore() {
      clipped = false;
    },
    beginPath() {},
    rect() {},
    clip() {
      clipped = true;
    },
    setLineDash() {},
    strokeRect() {},
    set font(v: string) {
      size = parseFloat(v);
    },
    get font() {
      return `${size}px x`;
    },
    set textAlign(v: string) {
      align = v;
    },
    set fillStyle(_v: string) {},
    set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {},
    set textBaseline(_v: string) {},
    measureText(t: string) {
      return { width: t.length * size * 0.5 };
    },
    fillText(text: string, x: number, y: number) {
      calls.push({ text, x, y, size, align, clipped });
    },
  };
  const canvas: any = { width: 0, height: 0, getContext: () => ctx };
  return { canvas: canvas as HTMLCanvasElement, calls };
}

const IMG = { naturalWidth: 1600, naturalHeight: 800 } as unknown as HTMLImageElement;

test('datos de ejemplo: dibuja todos los campos sin avisos con el layout por defecto', () => {
  const { canvas, calls } = fakeCanvas();
  const res = drawVoucher(canvas, IMG, sampleVoucher(), DEFAULT_LAYOUT);
  assert.deepEqual(res.warnings, []);
  assert.equal(res.width, 1600);
  assert.equal(res.height, 800);
  const textos = calls.map((c) => c.text);
  assert.ok(textos.includes('$ 12,345.67'));
  assert.ok(textos.includes('Papelería'));
  assert.ok(textos.includes('8,000.00'));
  assert.ok(textos.some((t) => /^\d\d\/\d\d\/\d{4}$/.test(t)), 'fecha dd/mm/aaaa');
  for (const c of calls) {
    assert.ok(c.x >= 0 && c.x <= 1600, `x fuera de la imagen: ${c.text}`);
    assert.ok(c.y >= 0 && c.y <= 800, `y fuera de la imagen: ${c.text}`);
  }
});

test('la imagen grande se reduce proporcionalmente al lado máximo', () => {
  const { canvas } = fakeCanvas();
  const big = { naturalWidth: 6400, naturalHeight: 3200 } as unknown as HTMLImageElement;
  const res = drawVoucher(canvas, big, sampleVoucher(), DEFAULT_LAYOUT, { maxSide: 3200 });
  assert.equal(res.width, 3200);
  assert.equal(res.height, 1600);
});

test('filas dinámicas: sin límite artificial y con aviso cuando no caben', () => {
  const v = sampleVoucher();
  v.cargos = Array.from({ length: 30 }, (_, i) => ({ ...newRow(), cuenta: `C${i}`, nombre: `N${i}`, importe: '1.00' }));
  const { canvas, calls } = fakeCanvas();
  const res = drawVoucher(canvas, IMG, v, DEFAULT_LAYOUT);
  assert.ok(res.warnings.some((w) => w.includes('30 filas')), 'debe avisar de las 30 filas');
  assert.equal(calls.filter((c) => /^C\d+$/.test(c.text)).length, 30, 'dibuja las 30 filas');
});

test('filas: se reparten dentro del espacio y respetan el alto máximo por fila', () => {
  const v = sampleVoucher();
  v.cargos = v.cargos.slice(0, 2);
  const { canvas, calls } = fakeCanvas();
  drawVoucher(canvas, IMG, v, DEFAULT_LAYOUT);
  const ys = calls.filter((c) => c.text === '5101-001' || c.text === '5101-002').map((c) => c.y);
  assert.equal(ys.length, 2);
  const paso = ys[1] - ys[0];
  assert.ok(Math.abs(paso - DEFAULT_LAYOUT.table.maxRowH * 800) < 0.5, `paso ${paso}`);

  const tabla = DEFAULT_LAYOUT.table;
  const lleno = sampleVoucher();
  lleno.cargos = Array.from({ length: 6 }, (_, i) => ({ ...newRow(), cuenta: `R${i}`, nombre: 'x', importe: '1' }));
  const r = fakeCanvas();
  drawVoucher(r.canvas, IMG, lleno, DEFAULT_LAYOUT);
  const yy = r.calls.filter((c) => /^R\d$/.test(c.text)).map((c) => c.y);
  const ultimo = yy[yy.length - 1];
  assert.ok(ultimo <= (tabla.y + tabla.h) * 800, 'la última fila queda dentro del área');
});

test('texto largo: se reduce, avisa y no se sale de su caja', () => {
  const v = sampleVoucher();
  v.concepto = 'palabra '.repeat(200);
  const { canvas, calls } = fakeCanvas();
  const res = drawVoucher(canvas, IMG, v, DEFAULT_LAYOUT);
  assert.ok(res.warnings.some((w) => w.includes('Concepto')));
  const lineas = calls.filter((c) => c.text.startsWith('palabra'));
  assert.ok(lineas.length <= DEFAULT_LAYOUT.fields.concepto.maxLines);
  assert.ok(lineas.every((c) => c.clipped), 'recortado a su caja');
  assert.ok(lineas.some((c) => c.text.endsWith('…')), 'termina con puntos suspensivos');
});

test('texto que cabe en 2 líneas se ajusta sin avisar', () => {
  const v = sampleVoucher();
  v.concepto = 'Compra de material para mantenimiento del área administrativa y pago de servicios del mes';
  const { canvas } = fakeCanvas();
  const res = drawVoucher(canvas, IMG, v, DEFAULT_LAYOUT);
  assert.deepEqual(res.warnings, []);
});

test('símbolo $ configurable y alineación derecha del importe', () => {
  const v = sampleVoucher();
  const sin = mergeLayout({ dollarPrefix: false });
  const { canvas, calls } = fakeCanvas();
  drawVoucher(canvas, IMG, v, sin);
  const imp = calls.find((c) => c.text === '12,345.67');
  assert.ok(imp, 'sin $');
  assert.equal(imp?.align, 'right');
});

test('mergeLayout completa ajustes parciales o antiguos', () => {
  const m = mergeLayout({ fields: { concepto: { x: 0.2 } } } as any);
  assert.equal(m.fields.concepto.x, 0.2);
  assert.equal(m.fields.concepto.maxLines, DEFAULT_LAYOUT.fields.concepto.maxLines);
  assert.equal(m.table.cols.importe.align, 'right');
  assert.deepEqual(mergeLayout(null), DEFAULT_LAYOUT);
});
