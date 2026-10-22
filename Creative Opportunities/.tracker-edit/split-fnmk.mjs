import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/coolf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { FileBlob, SpreadsheetFile, Workbook } = require('@oai/artifact-tool');

const root = 'C:/Users/coolf/OneDrive/Documents/claude/portoflio';
const actingFile = `${root}/Creative Opportunities/Vancouver Creative Opportunities.xlsx`;
const musicDir = `${root}/FNMK Music Outreach`;
const musicFile = `${musicDir}/FNMK Music Outreach.xlsx`;
const scratch = `${root}/Creative Opportunities/.tracker-edit`;
const actingBytes = await fs.readFile(actingFile);
const hash = crypto.createHash('sha256').update(actingBytes).digest('hex');
if ((await fs.readdir(`${root}/Creative Opportunities`)).some(n=>n.startsWith('~$Vancouver Creative Opportunities'))) throw new Error('Acting workbook open in Excel; split deferred.');
await fs.mkdir(musicDir,{recursive:true});
try { await fs.access(musicFile); throw new Error('FNMK workbook already exists; split deferred to protect edits.'); } catch(e) { if(e.code!=='ENOENT') throw e; }
await fs.writeFile(`${scratch}/Vancouver Creative Opportunities.pre-fnmk-split.xlsx`,actingBytes);

const acting = await SpreadsheetFile.importXlsx(await FileBlob.load(actingFile));
const old = acting.worksheets.getItem('Festival outreach');
const records = old.getRange('A1:L10').values;
if(records[1]?.[0] !== 'FVDED-2027' || records[9]?.[0] !== 'NIGHTLOVELL-2026-VAN') throw new Error('Unexpected outreach range; split deferred.');

const music = Workbook.create();
const sh = music.worksheets.add('Music outreach');
sh.showGridLines=false;
sh.tabColor='#D97706';
sh.getRange('A1:L10').values=records;
sh.getRange('A1:L1').format={fill:'#172554',font:{name:'Aptos',bold:true,color:'#FFFFFF',size:11},wrapText:true,rowHeight:33};
sh.getRange('A2:L10').format={fill:'#EFF6FF',font:{name:'Aptos',color:'#1F2937',size:10},wrapText:true,verticalAlignment:'center',rowHeight:84};
for(const [col,width] of Object.entries({A:20,B:34,C:28,D:34,E:16,F:16,G:62,H:52,I:51,J:20,K:51,L:74})) sh.getRange(`${col}:${col}`).format.columnWidth=width;
sh.freezePanes.freezeRows(1);
music.recalculate();
const musicOut=await SpreadsheetFile.exportXlsx(music);
const stagedMusic=`${scratch}/fnmk-split-staged.xlsx`;
await musicOut.save(stagedMusic);

old.getRange('A1:L10').clear({applyTo:'contents'});
old.getRange('A1:C1').values=[['FNMK music outreach has moved','','']];
old.getRange('A2:B2').values=[['Live workbook',musicFile]];
old.getRange('A3:B3').values=[['Acting applications remain in Opportunities','Music targets and outreach statuses are in the separate FNMK workbook.']];
acting.recalculate();
const actingOut=await SpreadsheetFile.exportXlsx(acting);
const stagedActing=`${scratch}/acting-split-staged.xlsx`;
await actingOut.save(stagedActing);

if(crypto.createHash('sha256').update(await fs.readFile(actingFile)).digest('hex')!==hash) throw new Error('Acting workbook changed during split; staged outputs retained.');
await fs.copyFile(stagedMusic,musicFile);
await fs.copyFile(stagedActing,actingFile);
console.log(JSON.stringify({musicFile,actingFile,records:records.length}));
