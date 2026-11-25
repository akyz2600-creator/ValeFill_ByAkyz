import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMonto, montoALetra, parseMonto } from '../src/lib/money.ts';
import { applyPatch, emptyVoucher, fileBase, isBlank, sampleVoucher } from '../src/lib/defaults.ts';
import { validateVoucher } from '../src/lib/validate.ts';

const letra = (s: string) => {
  const c = parseMonto(s);
  assert.notEqual(c, null, `no se pudo interpretar ${s}`);
  return montoALetra(c as number);
};

test('parseMonto: formatos válidos', () => {
  assert.equal(parseMonto('0'), 0);
  assert.equal(parseMonto('1'), 100);
  assert.equal(parseMonto('1,234.56'), 123456);
  assert.equal(parseMonto('$ 1234.5'), 123450);
  assert.equal(parseMonto('0.05'), 5);
  assert.equal(parseMonto('999,999,999,999.99'), 99999999999999);
});

test('parseMonto: formatos inválidos', () => {
  for (const s of ['', 'abc', '1.234.56', '12,34', '1.', '.5', '-5', '1,2345', '1.234', '1000000000000']) {
    assert.equal(parseMonto(s), null, `debería ser inválido: "${s}"`);
  }
});

test('formatMonto', () => {
  assert.equal(formatMonto(0), '0.00');
  assert.equal(formatMonto(5), '0.05');
  assert.equal(formatMonto(123456), '1,234.56');
  assert.equal(formatMonto(100000000), '1,000,000.00');
});

test('montoALetra: casos básicos', () => {
  assert.equal(letra('0'), 'CERO PESOS 00/100 M.N.');
  assert.equal(letra('1'), 'UN PESO 00/100 M.N.');
  assert.equal(letra('2'), 'DOS PESOS 00/100 M.N.');
  assert.equal(letra('15'), 'QUINCE PESOS 00/100 M.N.');
  assert.equal(letra('21'), 'VEINTIÚN PESOS 00/100 M.N.');
  assert.equal(letra('22'), 'VEINTIDÓS PESOS 00/100 M.N.');
  assert.equal(letra('31'), 'TREINTA Y UN PESOS 00/100 M.N.');
  assert.equal(letra('100'), 'CIEN PESOS 00/100 M.N.');
  assert.equal(letra('101'), 'CIENTO UN PESOS 00/100 M.N.');
  assert.equal(letra('0.99'), 'CERO PESOS 99/100 M.N.');
});

test('montoALetra: miles y millones', () => {
  assert.equal(letra('1000'), 'MIL PESOS 00/100 M.N.');
  assert.equal(letra('1,234.56'), 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 56/100 M.N.');
  assert.equal(letra('21,000'), 'VEINTIÚN MIL PESOS 00/100 M.N.');
  assert.equal(letra('100,000'), 'CIEN MIL PESOS 00/100 M.N.');
  assert.equal(letra('101,001'), 'CIENTO UN MIL UN PESOS 00/100 M.N.');
  assert.equal(letra('1,000,000'), 'UN MILLÓN DE PESOS 00/100 M.N.');
  assert.equal(letra('2,000,000'), 'DOS MILLONES DE PESOS 00/100 M.N.');
  assert.equal(letra('2,500,000.50'), 'DOS MILLONES QUINIENTOS MIL PESOS 50/100 M.N.');
  assert.equal(letra('1,000,001'), 'UN MILLÓN UN PESOS 00/100 M.N.');
  assert.equal(letra('1,000,000,000'), 'MIL MILLONES DE PESOS 00/100 M.N.');
  assert.equal(
    letra('999,999,999,999.99'),
    'NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE MILLONES NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE PESOS 99/100 M.N.',
  );
});

test('montoALetra: ningún entero de 0 a 20,000 produce texto vacío o raro', () => {
  for (let n = 0; n <= 20000; n++) {
    const t = montoALetra(n * 100);
    assert.match(t, /^[A-ZÁÉÍÓÚÑ ]+ \d\d\/100 M\.N\.$/, `salida rara para ${n}: ${t}`);
    assert.ok(!t.includes('  '), `doble espacio para ${n}`);
  }
});

test('applyPatch recalcula importe en letra en modo automático', () => {
  const v = applyPatch(emptyVoucher(), { importeNumero: '250' });
  assert.equal(v.importeLetra, 'DOSCIENTOS CINCUENTA PESOS 00/100 M.N.');
  const limpio = applyPatch(v, { importeNumero: 'xx' });
  assert.equal(limpio.importeLetra, '');
  const manual = applyPatch({ ...v, importeLetraAuto: false }, { importeNumero: '300' });
  assert.equal(manual.importeLetra, 'DOSCIENTOS CINCUENTA PESOS 00/100 M.N.');
});

test('validateVoucher', () => {
  const vacio = validateVoucher(emptyVoucher());
  assert.ok(vacio.some((i) => i.level === 'error' && i.field === 'importeNumero'));
  assert.ok(vacio.some((i) => i.level === 'error' && i.field === 'concepto'));

  const ok = validateVoucher(sampleVoucher());
  assert.equal(ok.filter((i) => i.level === 'error').length, 0);
  assert.equal(ok.filter((i) => i.level === 'warn').length, 0);

  const desbalance = sampleVoucher();
  desbalance.cargos[0].importe = '7,000.00';
  const w = validateVoucher(desbalance);
  assert.ok(w.some((i) => i.level === 'warn' && i.field === 'cargos'));

  const malFila = sampleVoucher();
  malFila.cargos[1].importe = 'abc';
  assert.ok(validateVoucher(malFila).some((i) => i.level === 'error' && i.field === 'cargo-s2'));

  const malFecha = sampleVoucher();
  malFecha.fecha = '2026-02-31';
  assert.ok(validateVoucher(malFecha).some((i) => i.field === 'fecha'));
});

test('isBlank y fileBase', () => {
  assert.equal(isBlank(emptyVoucher()), true);
  assert.equal(isBlank(sampleVoucher()), false);
  const v = sampleVoucher();
  v.fecha = '2026-11-25';
  assert.equal(fileBase(v), 'ValeFill_2026-11-25_12345.67');
});
