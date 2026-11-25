// Exportación (PNG / JPEG / PDF), descarga y compartir.
// En Android (Capacitor) se usa el menú nativo de compartir; en navegador, descarga normal.
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';

export type ExportFormat = 'png' | 'jpeg' | 'pdf';

export interface ExportFile {
  blob: Blob;
  mime: string;
  name: string;
}

const MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
};
const EXT: Record<ExportFormat, string> = { png: 'png', jpeg: 'jpg', pdf: 'pdf' };

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen (memoria insuficiente).'))),
      mime,
      quality,
    );
  });
}

export async function buildExport(canvas: HTMLCanvasElement, format: ExportFormat, baseName: string): Promise<ExportFile> {
  const name = `${baseName}.${EXT[format]}`;
  if (format === 'png') {
    return { blob: await canvasToBlob(canvas, MIME.png), mime: MIME.png, name };
  }
  if (format === 'jpeg') {
    return { blob: await canvasToBlob(canvas, MIME.jpeg, 0.95), mime: MIME.jpeg, name };
  }
  // PDF: una página A4 con la imagen ajustada (conservando proporciones).
  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const ratio = canvas.width / canvas.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, w, h);
  const blob = pdf.output('blob');
  return { blob, mime: MIME.pdf, name };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const res = String(fr.result);
      resolve(res.slice(res.indexOf(',') + 1));
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function isCancel(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /cancel/i.test(msg);
}

/** Descarga. En Android intenta guardar en Documentos/ValeFill; si no puede, abre el menú de compartir. */
export async function downloadFile(file: ExportFile): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const data = await blobToBase64(file.blob);
      await Filesystem.writeFile({
        path: `ValeFill/${file.name}`,
        data,
        directory: Directory.Documents,
        recursive: true,
      });
      return `Guardado en Documentos/ValeFill/${file.name}`;
    } catch (e) {
      await shareFile(file);
      return 'Se abrió el menú de compartir (desde ahí puedes guardarlo en el dispositivo).';
    }
  }
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return `Descargado: ${file.name}`;
}

/** Comparte con el menú nativo de Android (o Web Share / descarga en navegador). */
export async function shareFile(file: ExportFile): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(file.blob);
    const written = await Filesystem.writeFile({
      path: `ValeFill/${file.name}`,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await Share.share({
        title: 'Comprobante de gastos',
        files: [written.uri],
        dialogTitle: 'Compartir comprobante',
      });
    } catch (e) {
      if (!isCancel(e)) throw e;
    }
    return 'Compartido.';
  }
  const f = new File([file.blob], file.name, { type: file.mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [f] })) {
    try {
      await nav.share({ files: [f], title: 'Comprobante de gastos' });
    } catch (e) {
      if (!isCancel(e)) throw e;
    }
    return 'Compartido.';
  }
  return downloadFile(file);
}
