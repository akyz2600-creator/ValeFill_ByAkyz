export interface CargoRow {
  id: string;
  cuenta: string;
  nombre: string;
  importe: string;
}

export interface VoucherData {
  importeNumero: string;
  importeLetra: string;
  /** true: el importe en letra se calcula solo a partir del importe numérico. */
  importeLetraAuto: boolean;
  concepto: string;
  cargos: CargoRow[];
  /** Formato ISO yyyy-mm-dd */
  fecha: string;
  autorizadoPor: string;
  recibidoPor: string;
}

export interface VoucherRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: VoucherData;
}

export interface DraftRecord {
  data: VoucherData;
  editingId: string | null;
  savedAt: number;
}

export type View = 'form' | 'preview' | 'history' | 'calibrate';

export interface Notice {
  type: 'ok' | 'error' | 'info';
  text: string;
}
