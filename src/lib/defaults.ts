import type { CargoRow, VoucherData } from '../types.ts';
import { montoALetra, parseMonto } from './money.ts';

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 2026-11-25 -> 25/11/2026 */
export function formatFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function isValidISODate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export function newRow(): CargoRow {
  return { id: newId(), cuenta: '', nombre: '', importe: '' };
}

export function emptyVoucher(): VoucherData {
  return {
    importeNumero: '',
    importeLetra: '',
    importeLetraAuto: true,
    concepto: '',
    cargos: [newRow(), newRow(), newRow()],
    fecha: todayISO(),
    autorizadoPor: '',
    recibidoPor: '',
  };
}

/** Datos de ejemplo para calibrar posiciones. */
export function sampleVoucher(): VoucherData {
  return {
    importeNumero: '12,345.67',
    importeLetra: montoALetra(1234567),
    importeLetraAuto: true,
    concepto: 'Compra de material de oficina y papelería para el área administrativa',
    cargos: [
      { id: 's1', cuenta: '5101-001', nombre: 'Papelería', importe: '8,000.00' },
      { id: 's2', cuenta: '5101-002', nombre: 'Material de oficina', importe: '3,345.67' },
      { id: 's3', cuenta: '5101-003', nombre: 'Varios', importe: '1,000.00' },
    ],
    fecha: todayISO(),
    autorizadoPor: 'Nombre Apellido',
    recibidoPor: 'Nombre Apellido',
  };
}

/** Completa datos guardados (por ejemplo de versiones anteriores) con los valores por defecto. */
export function normalizeVoucher(d: Partial<VoucherData> | null | undefined): VoucherData {
  const base = emptyVoucher();
  const src = d ?? {};
  return {
    ...base,
    ...src,
    cargos: Array.isArray(src.cargos) && src.cargos.length > 0 ? src.cargos : base.cargos,
  };
}

/** Aplica un cambio al formulario y recalcula el importe en letra si está en modo automático. */
export function applyPatch(prev: VoucherData, patch: Partial<VoucherData>): VoucherData {
  const next: VoucherData = { ...prev, ...patch };
  if (next.importeLetraAuto && ('importeNumero' in patch || 'importeLetraAuto' in patch)) {
    const cents = parseMonto(next.importeNumero);
    next.importeLetra = cents === null ? '' : montoALetra(cents);
  }
  return next;
}

export function isBlank(d: VoucherData): boolean {
  return (
    !d.importeNumero.trim() &&
    !d.importeLetra.trim() &&
    !d.concepto.trim() &&
    !d.autorizadoPor.trim() &&
    !d.recibidoPor.trim() &&
    d.cargos.every((r) => !r.cuenta.trim() && !r.nombre.trim() && !r.importe.trim())
  );
}

/** Nombre base para archivos exportados. */
export function fileBase(d: VoucherData): string {
  const cents = parseMonto(d.importeNumero);
  const monto = cents === null ? 'sin-importe' : (cents / 100).toFixed(2);
  return `ValeFill_${d.fecha}_${monto}`.replace(/[^A-Za-z0-9._-]/g, '-');
}
