import type { VoucherData } from '../types';
import type { Issue } from '../lib/validate';
import { newRow, todayISO } from '../lib/defaults';
import { formatMonto, parseMonto } from '../lib/money';
import { Icon } from './Icon';

interface Props {
  data: VoucherData;
  issues: Issue[];
  warnings: string[];
  onChange: (patch: Partial<VoucherData>) => void;
}

function Msgs({ issues, field }: { issues: Issue[]; field: string }) {
  const list = issues.filter((i) => i.field === field);
  if (list.length === 0) return null;
  return (
    <>
      {list.map((i, k) => (
        <p key={k} className={`msg ${i.level}`}>
          {i.message}
        </p>
      ))}
    </>
  );
}

export function FormPanel({ data, issues, warnings, onChange }: Props) {
  const updateRow = (id: string, patch: Partial<{ cuenta: string; nombre: string; importe: string }>) => {
    onChange({ cargos: data.cargos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };
  const removeRow = (id: string) => onChange({ cargos: data.cargos.filter((r) => r.id !== id) });
  const addRow = () => onChange({ cargos: [...data.cargos, newRow()] });

  let suma = 0;
  let hayImportes = false;
  for (const r of data.cargos) {
    const c = parseMonto(r.importe);
    if (c !== null) {
      suma += c;
      hayImportes = true;
    }
  }
  const total = parseMonto(data.importeNumero);

  return (
    <div className="panel form">
      {warnings.length > 0 && (
        <div className="callout warn" role="status">
          <strong>Avisos de ajuste</strong>
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <section className="card">
        <h2>Encabezado</h2>
        <label htmlFor="importeNumero">Importe ($)</label>
        <div className="input-prefix">
          <span>$</span>
          <input
            id="importeNumero"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={data.importeNumero}
            onChange={(e) => onChange({ importeNumero: e.target.value })}
          />
        </div>
        <Msgs issues={issues} field="importeNumero" />

        <label htmlFor="importeLetra">Importe en letra</label>
        <textarea
          id="importeLetra"
          rows={2}
          readOnly={data.importeLetraAuto}
          value={data.importeLetra}
          placeholder="Se calcula automáticamente"
          onChange={(e) => onChange({ importeLetra: e.target.value })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={data.importeLetraAuto}
            onChange={(e) => onChange({ importeLetraAuto: e.target.checked })}
          />
          Calcular automáticamente (pesos mexicanos)
        </label>
        <Msgs issues={issues} field="importeLetra" />
      </section>

      <section className="card">
        <h2>Concepto</h2>
        <label htmlFor="concepto">Descripción del gasto</label>
        <textarea
          id="concepto"
          rows={3}
          value={data.concepto}
          onChange={(e) => onChange({ concepto: e.target.value })}
        />
        <Msgs issues={issues} field="concepto" />
      </section>

      <section className="card">
        <h2>Cárguese a</h2>
        {data.cargos.length === 0 && <p className="muted">Sin filas. Agrega una con el botón de abajo.</p>}
        {data.cargos.map((r, idx) => (
          <div className="row-card" key={r.id}>
            <div className="row-head">
              <span>Fila {idx + 1}</span>
              <button
                type="button"
                className="icon-btn danger"
                aria-label={`Eliminar fila ${idx + 1}`}
                onClick={() => removeRow(r.id)}
              >
                <Icon name="trash" />
              </button>
            </div>
            <label htmlFor={`cuenta-${r.id}`}>Número de cuenta</label>
            <input
              id={`cuenta-${r.id}`}
              autoComplete="off"
              value={r.cuenta}
              onChange={(e) => updateRow(r.id, { cuenta: e.target.value })}
            />
            <label htmlFor={`nombre-${r.id}`}>Nombre</label>
            <input
              id={`nombre-${r.id}`}
              autoComplete="off"
              value={r.nombre}
              onChange={(e) => updateRow(r.id, { nombre: e.target.value })}
            />
            <label htmlFor={`importe-${r.id}`}>Importe</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                id={`importe-${r.id}`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={r.importe}
                onChange={(e) => updateRow(r.id, { importe: e.target.value })}
              />
            </div>
            <Msgs issues={issues} field={`cargo-${r.id}`} />
          </div>
        ))}
        <button type="button" className="btn secondary block" onClick={addRow}>
          <Icon name="plus" /> Agregar fila
        </button>
        {hayImportes && (
          <p className={`sum ${total !== null && total === suma ? 'ok' : ''}`}>
            Suma de filas: ${formatMonto(suma)}
            {total !== null ? ` · Importe: $${formatMonto(total)}` : ''}
          </p>
        )}
        <Msgs issues={issues} field="cargos" />
      </section>

      <section className="card">
        <h2>Control</h2>
        <label htmlFor="fecha">Fecha</label>
        <div className="inline">
          <input
            id="fecha"
            type="date"
            value={data.fecha}
            onChange={(e) => onChange({ fecha: e.target.value })}
          />
          <button type="button" className="btn secondary" onClick={() => onChange({ fecha: todayISO() })}>
            Hoy
          </button>
        </div>
        <Msgs issues={issues} field="fecha" />

        <label htmlFor="autorizadoPor">Autorizado por</label>
        <input
          id="autorizadoPor"
          autoComplete="off"
          value={data.autorizadoPor}
          onChange={(e) => onChange({ autorizadoPor: e.target.value })}
        />
        <Msgs issues={issues} field="autorizadoPor" />

        <label htmlFor="recibidoPor">Recibido por</label>
        <input
          id="recibidoPor"
          autoComplete="off"
          value={data.recibidoPor}
          onChange={(e) => onChange({ recibidoPor: e.target.value })}
        />
        <Msgs issues={issues} field="recibidoPor" />
      </section>
    </div>
  );
}
