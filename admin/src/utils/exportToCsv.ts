export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T | string; header: string }[]
): void {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  const keys = columns ? columns.map(col => col.key as string) : Object.keys(rows[0]);
  const headers = columns ? columns.map(col => col.header) : keys;

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of rows) {
    const values = keys.map(k => {
      let val = row[k];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
