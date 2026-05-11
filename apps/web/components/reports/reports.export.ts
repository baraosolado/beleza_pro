import type { ReportLedgerRow } from './reports.types';

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadLedgerCsv(
  rows: ReportLedgerRow[],
  metaLines: string[]
): void {
  const BOM = '\uFEFF';
  const head = ['Data (ISO)', 'Entidade', 'Domínio', 'Métrica', 'Valor', 'Status'];
  const lines = [
    ...metaLines.map((l) => csvCell(l)),
    head.map(csvCell).join(','),
    ...rows.map((r) =>
      [
        r.at,
        r.entity,
        r.domain,
        r.metric,
        String(r.value),
        r.status,
      ]
        .map(csvCell)
        .join(',')
    ),
  ];
  const blob = new Blob([BOM + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-detalhado-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
