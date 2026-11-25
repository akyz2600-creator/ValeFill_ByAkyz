// Posiciones de escritura sobre la plantilla.
// TODAS las coordenadas son relativas a la imagen (0..1 del ancho / alto), por lo que no
// dependen de la resolución de pantalla. Los tamaños de letra son fracción del ALTO de la imagen.
//
// IMPORTANTE: estos valores por defecto son PROVISIONALES (se definieron sin ver la imagen
// real). Usa la pestaña «Calibrar» de la app para ajustarlos sobre public/vale-azul.jpg;
// los ajustes se guardan en el dispositivo. Para dejarlos fijos para todos, copia el JSON
// desde «Calibrar» y pégalo en DEFAULT_LAYOUT.

export type Align = 'left' | 'center' | 'right';

export type FieldKey =
  | 'importeNumero'
  | 'importeLetra'
  | 'concepto'
  | 'fecha'
  | 'autorizadoPor'
  | 'recibidoPor';

export type ColKey = 'cuenta' | 'nombre' | 'importe';

export interface TextBox {
  x: number;
  y: number;
  w: number;
  h: number;
  align: Align;
  /** Tamaño de letra máximo, fracción del alto de la imagen. */
  size: number;
  maxLines: number;
}

export interface ColumnDef {
  x: number;
  w: number;
  align: Align;
}

export interface TableLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Alto máximo de cada fila (fracción del alto de la imagen). */
  maxRowH: number;
  size: number;
  cols: Record<ColKey, ColumnDef>;
}

export interface LayoutConfig {
  version: number;
  /** Tamaño mínimo de letra legible (fracción del alto). Por debajo se advierte. */
  minSize: number;
  /** Dibujar el símbolo «$» junto al importe numérico del encabezado. */
  dollarPrefix: boolean;
  fields: Record<FieldKey, TextBox>;
  table: TableLayout;
}

export const FIELD_KEYS: FieldKey[] = [
  'importeNumero',
  'importeLetra',
  'concepto',
  'fecha',
  'autorizadoPor',
  'recibidoPor',
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  importeNumero: 'Importe ($)',
  importeLetra: 'Importe en letra',
  concepto: 'Concepto',
  fecha: 'Fecha',
  autorizadoPor: 'Autorizado por',
  recibidoPor: 'Recibido por',
};

export const COL_KEYS: ColKey[] = ['cuenta', 'nombre', 'importe'];

export const COL_LABELS: Record<ColKey, string> = {
  cuenta: 'Cuenta',
  nombre: 'Nombre',
  importe: 'Importe',
};

export const DEFAULT_LAYOUT: LayoutConfig = {
  version: 1,
  minSize: 0.016,
  dollarPrefix: true,
  fields: {
    importeNumero: { x: 0.68, y: 0.08, w: 0.27, h: 0.08, align: 'right', size: 0.05, maxLines: 1 },
    importeLetra: { x: 0.1, y: 0.2, w: 0.85, h: 0.09, align: 'left', size: 0.04, maxLines: 2 },
    concepto: { x: 0.1, y: 0.31, w: 0.85, h: 0.15, align: 'left', size: 0.04, maxLines: 3 },
    fecha: { x: 0.08, y: 0.88, w: 0.2, h: 0.06, align: 'center', size: 0.04, maxLines: 1 },
    autorizadoPor: { x: 0.36, y: 0.88, w: 0.27, h: 0.06, align: 'center', size: 0.04, maxLines: 1 },
    recibidoPor: { x: 0.67, y: 0.88, w: 0.27, h: 0.06, align: 'center', size: 0.04, maxLines: 1 },
  },
  table: {
    x: 0.08,
    y: 0.55,
    w: 0.86,
    h: 0.24,
    maxRowH: 0.08,
    size: 0.04,
    cols: {
      cuenta: { x: 0.08, w: 0.24, align: 'left' },
      nombre: { x: 0.34, w: 0.4, align: 'left' },
      importe: { x: 0.76, w: 0.18, align: 'right' },
    },
  },
};

function mergeBox(base: TextBox, saved: Partial<TextBox> | undefined): TextBox {
  return { ...base, ...(saved ?? {}) };
}

/** Combina un layout guardado (posiblemente incompleto o antiguo) con los valores por defecto. */
export function mergeLayout(saved: Partial<LayoutConfig> | null | undefined): LayoutConfig {
  const d = DEFAULT_LAYOUT;
  const s = saved ?? {};
  const fields = {} as Record<FieldKey, TextBox>;
  for (const k of FIELD_KEYS) fields[k] = mergeBox(d.fields[k], s.fields?.[k]);
  const cols = {} as Record<ColKey, ColumnDef>;
  for (const k of COL_KEYS) cols[k] = { ...d.table.cols[k], ...(s.table?.cols?.[k] ?? {}) };
  return {
    version: d.version,
    minSize: typeof s.minSize === 'number' ? s.minSize : d.minSize,
    dollarPrefix: typeof s.dollarPrefix === 'boolean' ? s.dollarPrefix : d.dollarPrefix,
    fields,
    table: { ...d.table, ...(s.table ?? {}), cols },
  };
}
