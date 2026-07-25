// Minimal xlsx (Excel) export helper built on the `xlsx` (SheetJS) package.
//
// SECURITY NOTE: the npm registry build of `xlsx` has known vulnerabilities
// (prototype pollution, ReDoS) in its *parsing* code (XLSX.read/readFile) —
// see `npm audit`. This app only ever calls `XLSX.write` on data we generate
// ourselves from the database; the vulnerable parse path is never exercised.
// Do not add a "import xlsx" feature (parsing user-uploaded spreadsheets)
// without first switching to a patched build (SheetJS's own CDN, blocked in
// this sandbox) or an alternative library.
const XLSX = require('xlsx');

// rows: array of plain objects (same shape as the existing CSV export rows).
// Returns a Buffer ready to send as an .xlsx download.
function rowsToXlsxBuffer(rows, sheetName = 'Sheet1') {
  const sheet = XLSX.utils.json_to_sheet(rows || []);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}

function sendXlsx(res, rows, filename, sheetName) {
  const buffer = rowsToXlsxBuffer(rows, sheetName);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

module.exports = { rowsToXlsxBuffer, sendXlsx };
