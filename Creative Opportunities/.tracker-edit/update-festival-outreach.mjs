import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/coolf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { FileBlob, SpreadsheetFile } = require('@oai/artifact-tool');

const folder = 'C:/Users/coolf/OneDrive/Documents/claude/portoflio/Creative Opportunities';
const source = `${folder}/Vancouver Creative Opportunities.xlsx`;
const scratch = `${folder}/.tracker-edit`;
const staged = `${scratch}/new-music-targets-staged.xlsx`;
const backup = `${scratch}/Vancouver Creative Opportunities.pre-new-music-targets.xlsx`;
const bytes = await fs.readFile(source);
const hash = crypto.createHash('sha256').update(bytes).digest('hex');
const names = await fs.readdir(folder);
if (names.some(n => n.startsWith('~$Vancouver Creative Opportunities'))) throw new Error('Workbook is open in Excel; write deferred.');
await fs.writeFile(backup, bytes);
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const existing = await wb.inspect({kind:'sheet',include:'id,name',maxChars:2000});
console.log('Before:', existing.ndjson ?? JSON.stringify(existing));
const sh = wb.worksheets.getItem('Festival outreach');
sh.getRange('I1').values = [['Contact / email thread']];
const rows = [
 ['BASSCOAST-2027-VIDEO','Bass Coast Festival','In-house videography application','Open: deadline Jan 12, 2027','','',
 'Apply through official video form with public video samples; confirm compensation, deliverables, travel and time off.',
 'https://basscoast.ca/pages/applications/videography','Official application form linked from source','Unknown',
 'July 9–12, 2027 in Merritt, BC; requires travel and likely time off.',
 'Application open Oct 15, 2026–Jan 12, 2027. Separate from press/photo applications. Limited spots. No application submitted.'],
 ['OFF2-2026','OFF2 Entertainment: Doomsnight / Dreamstate','Promoter content-team route','Research: no open media role listed','','',
 'Prepare relevant EDM samples; consider a tailored careers inquiry only after reviewing role fit and schedule.',
 'https://off2project.com/careers.html','careers@off2.ca','Unknown',
 'Doomsnight Oct 31 at Pacific Coliseum; Dreamstate Nov 28 at Tradex, Abbotsford. Event shifts may be evening/weekend.',
 'Organizer confirms events and says no open roles currently; public careers inbox accepts introductions for production, lighting, sound, programming or front of house. Videography hiring route unconfirmed.'],
 ['ELECTRICSKY-2027','Electric Sky Festival','Media team / capture route','Watch: media applications not yet open','','',
 'Watch official Capture section for 2027 media-team opening; verify location, dates and terms.',
 'https://www.electricsky.ca/get-involved','No media contact verified','Unknown',
 'Event schedule and travel not yet confirmed for this lead.',
 'Official get-involved page says media-team applications for 2027 will open soon. No application or email sent.'],
 ['TENNYSON-2026-JADE','Tennyson King at Jade Music Fest','Independent artist management inquiry','Research: artist show verified; filming role unconfirmed','','',
 'Review event time and two relevant samples, then draft a one-show video offer for approval; coordinate filming permission with festival.',
 'https://jmfa.ca/vancouver/','management@tennysonking.com','Unknown',
 'Jade Music Fest Nov 3–8 in Vancouver; exact Showcase G date/time to reconfirm.',
 'Official festival lineup lists Tennyson King in Showcase G; artist official site publicly lists management email. This is a prospect, not a job opening.'],
 ['NIGHTLOVELL-2026-VAN','Night Lovell at Commodore Ballroom','Major touring artist / tour-content route','Research: show verified; contact not verified','','',
 'Find authorized management or tour-content contact; do not use ticket/venue inbox as artist hiring route.',
 'https://www.commodoreballroom.com/shows','No artist media contact verified','Unknown',
 'Vancouver show Nov 29, 2026; evening event, subject to permission and shift fit.',
 'Venue lists Nov 29 show. No videography opening, filming approval or management contact verified. Do not pitch until route is confirmed.']
];
const ids = sh.getRange('A1:A100').values.flat().filter(Boolean);
if (rows.some(r => ids.includes(r[0]))) throw new Error('Target ID already exists; refusing duplicate append.');
sh.getRange('A6:L10').values = rows;
sh.getRange('A6:L10').format = {fill:'#EFF6FF',font:{name:'Aptos',color:'#1F2937',size:10},wrapText:true,verticalAlignment:'center',rowHeight:84};
wb.recalculate();
console.log('New:', (await wb.inspect({kind:'region',sheetId:'Festival outreach',range:'A1:L10',maxChars:3000})).ndjson);
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(staged);
const current = await fs.readFile(source);
if (crypto.createHash('sha256').update(current).digest('hex') !== hash) throw new Error('Workbook changed concurrently; staged copy retained, write deferred.');
await fs.copyFile(staged, source);
console.log('Saved', source);
