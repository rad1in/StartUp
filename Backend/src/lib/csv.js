// Minimal RFC-4180-ish CSV parser for user-uploaded bulk-import files.
//
// Deliberately NOT using the `xlsx` (SheetJS) package's XLSX.read/readFile for
// parsing user input — see the security note in `lib/xlsxExport.js`: that
// package's parse path has known prototype-pollution/ReDoS issues in the
// npm-registry build this project uses. This is a plain state machine with no
// eval/regex-backtracking risk, so bulk-import uploads stay CSV, not xlsx.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const clean = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? '').trim();
    });
    return obj;
  });
}

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

function renderAccountingSummaryCsv({ summary, byCategory, byItem }) {
  const rows = [
    ['Metric', 'Value'],
    ['Period', summary.period],
    ['Since', new Date(summary.since).toISOString()],
    ['Order count', summary.orderCount],
    ['Total revenue', summary.totalRevenue],
    ['Total commission', summary.totalCommission],
    ['Net revenue', summary.netRevenue],
    [],
    ['Category', 'Revenue'],
    ...byCategory.map((row) => [row.category, row.revenue]),
    [],
    ['Item', 'Quantity', 'Revenue'],
    ...byItem.map((row) => [row.item, row.quantity, row.revenue]),
  ];
  return toCsv(rows);
}

module.exports = { toCsv, renderAccountingSummaryCsv, parseCsv };
