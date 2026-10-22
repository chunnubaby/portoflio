import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const runtimeRequire = createRequire('C:/Users/coolf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { FileBlob, SpreadsheetFile } = runtimeRequire('@oai/artifact-tool');

const inputPath = 'C:/Users/coolf/OneDrive/Documents/claude/portoflio/Creative Opportunities/Vancouver Creative Opportunities.xlsx';
const outputPath = 'C:/Users/coolf/OneDrive/Documents/claude/portoflio/Creative Opportunities/.tracker-edit/updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const opportunities = workbook.worksheets.getItem('Opportunities');
const id = opportunities.getRange('A10').values[0][0];
if (id !== 'MISTAKE-BEN') throw new Error(`Expected MISTAKE-BEN at row 10; found ${id}`);

opportunities.getRange('B10').values = [['Submitted']];
opportunities.getRange('J10').values = [['Watch for self-tape instructions and casting reply']];
opportunities.getRange('K10').values = [[new Date('2026-10-20T00:00:00Z')]];
opportunities.getRange('K10').numberFormat = 'yyyy-mm-dd';

workbook.recalculate();
const check = await workbook.inspect({ kind: 'region', sheetId: 'Opportunities', range: 'A10:M10', maxChars: 2000 });
console.log(check.ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath} (${(await fs.stat(outputPath)).size} bytes)`);
