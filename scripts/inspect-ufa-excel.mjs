import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const wb = XLSX.read(readFileSync('C:/Users/Tapanawat/Downloads/Upload_Fcst_UFA.xlsx'), { type: 'buffer' });
console.log('sheets', wb.SheetNames);
for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, blankrows: false });
  console.log('\n---', name, 'rows', rows.length);
  const header = rows[0] ?? [];
  console.log('cols', header.length);
  for (let i = 0; i < Math.min(header.length, 40); i += 1) {
    console.log(i, String(header[i] ?? ''));
  }
  if (rows[1]) {
    console.log('sample B-D', rows[1][1], rows[1][2], rows[1][3]);
  }
}
