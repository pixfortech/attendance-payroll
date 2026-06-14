/* ============================================================
   Client-side file export helpers.
   TODO(backend): server-generated XLSX/PDF for production-grade exports;
   these produce CSV / browser-print which is the best frontend-only option.
   ============================================================ */

/** Escape and join rows into a CSV string. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}

/** Trigger a browser download of text content (defaults to CSV). */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Convenience: build + download a CSV. */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  downloadText(filename, toCsv(rows));
}
