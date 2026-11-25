// Utilidades de dinero: trabajan siempre con CENTAVOS enteros para evitar errores de coma flotante.

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

/** Máximo soportado: 999,999,999,999.99 */
export const MAX_CENTS = 99999999999999;

/** Convierte texto como "1,234.56" o "$ 1234.5" a centavos. Devuelve null si no es válido. */
export function parseMonto(input: string): number | null {
  const s = input.replace(/[\s$]/g, '');
  if (s === '') return null;
  const m = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const entero = Number(m[1].replace(/,/g, ''));
  const dec = (m[2] ?? '').padEnd(2, '0');
  const cents = entero * 100 + Number(dec);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return cents;
}

/** 123456 -> "1,234.56" */
export function formatMonto(cents: number): string {
  const pesos = Math.floor(cents / 100);
  const cc = String(cents % 100).padStart(2, '0');
  return pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + cc;
}

function apocopar(s: string): string {
  return s.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN');
}

/** 1..999 (con apócope: UN / VEINTIÚN, porque siempre precede a MIL, MILLONES o PESOS). */
function menorAMil(n: number): string {
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (r > 0) {
    if (r < 30) {
      partes.push(UNIDADES[r]);
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u === 0 ? DECENAS[d] : DECENAS[d] + ' Y ' + UNIDADES[u]);
    }
  }
  return apocopar(partes.join(' '));
}

/** 1..999,999 */
function menorAUnMillon(n: number): string {
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (miles > 0) partes.push(miles === 1 ? 'MIL' : menorAMil(miles) + ' MIL');
  if (resto > 0) partes.push(menorAMil(resto));
  return partes.join(' ');
}

/** 2..999,999,999,999 */
function enteroALetras(n: number): string {
  const millones = Math.floor(n / 1000000);
  const resto = n % 1000000;
  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLÓN' : menorAUnMillon(millones) + ' MILLONES');
  }
  if (resto > 0) partes.push(menorAUnMillon(resto));
  return partes.join(' ');
}

/** 123456 -> "MIL DOSCIENTOS TREINTA Y CUATRO PESOS 56/100 M.N." */
export function montoALetra(cents: number): string {
  const pesos = Math.floor(cents / 100);
  const cc = String(cents % 100).padStart(2, '0');
  let palabras: string;
  if (pesos === 0) palabras = 'CERO PESOS';
  else if (pesos === 1) palabras = 'UN PESO';
  else palabras = enteroALetras(pesos) + (pesos % 1000000 === 0 ? ' DE PESOS' : ' PESOS');
  return `${palabras} ${cc}/100 M.N.`;
}
