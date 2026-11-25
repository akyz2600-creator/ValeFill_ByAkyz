import type { VoucherRecord } from '../types';
import { formatFecha } from '../lib/defaults';
import { formatMonto, parseMonto } from '../lib/money';
import { Icon } from './Icon';

interface Props {
  items: VoucherRecord[];
  editingId: string | null;
  onEdit: (rec: VoucherRecord) => void;
  onDuplicate: (rec: VoucherRecord) => void;
  onDelete: (rec: VoucherRecord) => void;
}

function fmtStamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function HistoryPanel({ items, editingId, onEdit, onDuplicate, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="panel">
        <div className="card empty">
          <h2>Historial vacío</h2>
          <p className="muted">
            Los comprobantes que guardes (o exportes, o que dejes al crear uno nuevo) aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="panel">
      {items.map((rec) => {
        const c = parseMonto(rec.data.importeNumero);
        const monto = c !== null ? `$${formatMonto(c)}` : rec.data.importeNumero ? `$${rec.data.importeNumero}` : 'Sin importe';
        return (
          <article className={`card hist ${rec.id === editingId ? 'active' : ''}`} key={rec.id}>
            <div className="hist-top">
              <strong className="hist-amount">{monto}</strong>
              <span className="muted">{formatFecha(rec.data.fecha)}</span>
            </div>
            <p className="hist-concept">{rec.data.concepto.trim() || 'Sin concepto'}</p>
            <p className="muted small-text">
              Modificado {fmtStamp(rec.updatedAt)}
              {rec.id === editingId ? ' · en edición' : ''}
            </p>
            <div className="hist-actions">
              <button type="button" className="btn secondary" onClick={() => onEdit(rec)}>
                <Icon name="edit" /> Editar
              </button>
              <button type="button" className="btn secondary" onClick={() => onDuplicate(rec)}>
                <Icon name="copy" /> Duplicar
              </button>
              <button type="button" className="btn danger" onClick={() => onDelete(rec)}>
                <Icon name="trash" /> Eliminar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
