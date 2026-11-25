import type { VoucherData } from '../types.ts';
import { formatMonto, montoALetra, parseMonto } from './money.ts';
import { isValidISODate } from './defaults.ts';

export interface Issue {
  level: 'error' | 'warn';
  field: string;
  message: string;
}

export function validateVoucher(d: VoucherData): Issue[] {
  const issues: Issue[] = [];
  const err = (field: string, message: string) => issues.push({ level: 'error', field, message });
  const warn = (field: string, message: string) => issues.push({ level: 'warn', field, message });

  // Importe numérico
  const total = parseMonto(d.importeNumero);
  if (!d.importeNumero.trim()) {
    err('importeNumero', 'Captura el importe.');
  } else if (total === null) {
    err('importeNumero', 'Importe inválido. Usa solo números, con máximo 2 decimales (ej. 1,234.50).');
  } else if (total === 0) {
    err('importeNumero', 'El importe debe ser mayor a cero.');
  }

  // Importe en letra
  if (!d.importeLetra.trim()) {
    err('importeLetra', 'Falta el importe en letra.');
  } else if (!d.importeLetraAuto && total !== null && d.importeLetra.trim() !== montoALetra(total)) {
    warn('importeLetra', 'El importe en letra editado no coincide con el importe numérico.');
  }

  // Concepto
  if (!d.concepto.trim()) err('concepto', 'Escribe el concepto del gasto.');

  // Cárguese a
  const filas = d.cargos.map((r, i) => ({ r, i })).filter(({ r }) => r.cuenta.trim() || r.nombre.trim() || r.importe.trim());
  if (filas.length === 0) {
    warn('cargos', 'No hay filas en «Cárguese a».');
  }
  let suma = 0;
  let hayImportes = false;
  for (const { r, i } of filas) {
    const n = i + 1;
    if (!r.cuenta.trim()) warn(`cargo-${r.id}`, `Fila ${n}: falta el número de cuenta.`);
    if (!r.nombre.trim()) warn(`cargo-${r.id}`, `Fila ${n}: falta el nombre.`);
    const c = parseMonto(r.importe);
    if (!r.importe.trim()) {
      err(`cargo-${r.id}`, `Fila ${n}: falta el importe.`);
    } else if (c === null) {
      err(`cargo-${r.id}`, `Fila ${n}: importe inválido.`);
    } else if (c === 0) {
      err(`cargo-${r.id}`, `Fila ${n}: el importe debe ser mayor a cero.`);
    } else {
      suma += c;
      hayImportes = true;
    }
  }
  if (hayImportes && total !== null && total > 0 && suma !== total) {
    warn(
      'cargos',
      `La suma de «Cárguese a» ($${formatMonto(suma)}) no coincide con el importe ($${formatMonto(total)}).`,
    );
  }

  // Control
  if (!isValidISODate(d.fecha)) err('fecha', 'Fecha inválida.');
  if (!d.autorizadoPor.trim()) warn('autorizadoPor', 'Falta «Autorizado por».');
  if (!d.recibidoPor.trim()) warn('recibidoPor', 'Falta «Recibido por».');

  return issues;
}
