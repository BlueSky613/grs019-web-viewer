// GRS019 CSV -> per-layer sparse voxel-index .bin + manifest.json
// Record (AoS, little-endian): ix:uint16, iy:uint16, iz:uint8  = 5 bytes/point
// world: x=origin[0]+ix*spacing[0], y=origin[1]+iy*spacing[1], z=origin[2]+iz*spacing[2]
const fs = require('fs');
const path = require('path');

const CSV = 'C:\\Users\\KimYunMi\\Documents\\SouthernOntario\\rawData\\Ontario_Bedrock_Ver_1-0_CSV\\Ontario_BR_Ver1_trim.csv';
const OUTDIR = 'C:\\Users\\KimYunMi\\Documents\\SouthernOntario\\viewerData';
const PTDIR = path.join(OUTDIR, 'points');

const ORIGIN = [322400, 4615200, -1520];
const SPACING = [400, 400, 10];
const DIMS = [1410, 996, 206]; // nx, ny, nz

// code -> [name, group, age]
const META = {
  '001': ['Overburden', '-', 'Quaternary'],
  '300': ['Port Lambton Group', 'Port Lambton', 'Devonian'],
  '301': ['Kettle Point', 'Kettle Point', 'Devonian'],
  '303': ['Hamilton Group', 'Hamilton', 'Devonian'],
  '305': ['Marcellus', 'Hamilton', 'Devonian'],
  '306': ['Dundee', 'Detroit River', 'Devonian'],
  '308': ['Columbus', 'Detroit River', 'Devonian'],
  '309': ['Lucas', 'Detroit River', 'Devonian'],
  '311': ['Amherstburg', 'Detroit River', 'Devonian'],
  '312': ['Sylvania', 'Detroit River', 'Devonian'],
  '314': ['Bois Blanc', 'Detroit River', 'Devonian'],
  '315': ['Springvale', 'Detroit River', 'Devonian'],
  '318': ['Oriskany', 'Detroit River', 'Devonian'],
  '400': ['Bass Islands/Bertie', 'Bass Islands', 'Silurian'],
  '401': ['G Unit', 'Salina', 'Silurian'],
  '402': ['F Unit', 'Salina', 'Silurian'],
  '403': ['F Salt', 'Salina', 'Silurian'],
  '404': ['E Unit', 'Salina', 'Silurian'],
  '405': ['D Unit', 'Salina', 'Silurian'],
  '406': ['C Unit', 'Salina', 'Silurian'],
  '407': ['B Unit', 'Salina', 'Silurian'],
  '408': ['B Equivalent', 'Salina', 'Silurian'],
  '409': ['B Salt', 'Salina', 'Silurian'],
  '410': ['B Anhydrite', 'Salina', 'Silurian'],
  '411': ['A-2 Carbonate', 'Salina', 'Silurian'],
  '412': ['A-2 Shale', 'Salina', 'Silurian'],
  '413': ['A-2 Salt', 'Salina', 'Silurian'],
  '414': ['A-2 Anhydrite', 'Salina', 'Silurian'],
  '415': ['A-1 Carbonate', 'Salina', 'Silurian'],
  '416': ['A-1 Evaporite', 'Salina', 'Silurian'],
  '418': ['Guelph', 'Lockport', 'Silurian'],
  '420': ['Eramosa', 'Lockport', 'Silurian'],
  '421': ['Goat Island', 'Lockport', 'Silurian'],
  '422': ['Gasport', 'Lockport', 'Silurian'],
  '426': ['DeCew', 'Clinton', 'Silurian'],
  '428': ["Rochester (Lion's Head)", 'Clinton', 'Silurian'],
  '429': ['Irondequoit-Fossil Hill-Reynales', 'Clinton', 'Silurian'],
  '430': ['St Edmund', 'Clinton', 'Silurian'],
  '431': ['Wingfield', 'Clinton', 'Silurian'],
  '432': ['Dyer Bay', 'Clinton', 'Silurian'],
  '433': ['Neahga', 'Clinton', 'Silurian'],
  '434': ['Thorold', 'Clinton', 'Silurian'],
  '439': ['Grimsby', 'Medina', 'Silurian'],
  '440': ['Cabot Head', 'Medina', 'Silurian'],
  '441': ['Manitoulin', 'Medina', 'Silurian'],
  '442': ['Whirlpool', 'Medina', 'Silurian'],
  '500': ['Queenston', 'Queenston', 'Ordovician'],
  '502': ['Georgian Bay-Blue Mountain', 'Georgian Bay', 'Ordovician'],
  '511': ['Cobourg', 'Trenton', 'Ordovician'],
  '515': ['Sherman Fall', 'Trenton', 'Ordovician'],
  '517': ['Kirkfield', 'Trenton', 'Ordovician'],
  '519': ['Coboconk', 'Black River', 'Ordovician'],
  '522': ['Gull River', 'Black River', 'Ordovician'],
  '523': ['Shadow Lake', 'Black River', 'Ordovician'],
  '600': ['Cambrian', '-', 'Cambrian'],
  '700': ['Precambrian', '-', 'Precambrian'],
};
const AGE_HUE = { Quaternary: 48, Devonian: 28, Silurian: 172, Ordovician: 130, Cambrian: 92, Precambrian: 328 };

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}
// assign colors: within each age, step lightness across codes in order
const codesByAge = {};
Object.keys(META).sort().forEach(c => { const a = META[c][2]; (codesByAge[a] ||= []).push(c); });
const COLOR = {};
for (const age in codesByAge) {
  const arr = codesByAge[age];
  arr.forEach((c, i) => {
    const l = arr.length === 1 ? 55 : 38 + (34 * i) / (arr.length - 1);
    COLOR[c] = hslToHex(AGE_HUE[age], 55, l);
  });
}

if (!fs.existsSync(PTDIR)) fs.mkdirSync(PTDIR, { recursive: true });

function sanitize(s) { return s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

const BATCH = 1 << 20; // 1 MiB per-layer write batch
const layers = new Map(); // code -> state

function getLayer(code, name) {
  let L = layers.get(code);
  if (L) return L;
  const file = code + '_' + sanitize(name) + '.bin';
  const fd = fs.openSync(path.join(PTDIR, file), 'w');
  L = { code, name, file, fd, buf: Buffer.allocUnsafe(BATCH), pos: 0, count: 0,
        minix: 1e9, maxix: -1e9, miniy: 1e9, maxiy: -1e9, miniz: 255, maxiz: -1 };
  layers.set(code, L);
  return L;
}
function flush(L) { if (L.pos) { fs.writeSync(L.fd, L.buf, 0, L.pos); L.pos = 0; } }

// ---- streaming parse ----
const fd = fs.openSync(CSV, 'r');
const CHUNK = 1 << 22; // 4 MiB
const chunk = Buffer.allocUnsafe(CHUNK);
let leftover = Buffer.alloc(0);
let total = 0, anomalies = 0, firstLine = true;
const t0 = Date.now();

const NL = 10, COMMA = 44, MINUS = 45, COLON = 58, US = 95, D0 = 48, D9 = 57;

function processLine(b, s, e) { // parse [s,e) within buffer b (one line, no newline)
  if (firstLine) { firstLine = false; if (b[s] === 120) return; } // skip "x,y,z,..." header
  // field boundaries: 3 commas
  let c1 = -1, c2 = -1, c3 = -1;
  for (let i = s; i < e; i++) { const ch = b[i]; if (ch === COMMA) { if (c1 < 0) c1 = i; else if (c2 < 0) c2 = i; else { c3 = i; break; } } }
  if (c3 < 0) return;
  const x = parseIntRange(b, s, c1);
  const y = parseIntRange(b, c1 + 1, c2);
  const z = parseIntRange(b, c2 + 1, c3);
  // code: after ':' skip to first digit, read until '_'
  let i = c3 + 1;
  while (i < e && b[i] !== COLON) i++;
  i++;
  while (i < e && !(b[i] >= D0 && b[i] <= D9)) i++;
  let cs = i;
  while (i < e && b[i] >= D0 && b[i] <= D9) i++;
  const code = b.toString('latin1', cs, i);
  if (code.length === 0) return;
  let L = layers.get(code);
  if (!L) {
    // derive name: after code's trailing '_' to end
    let j = i; if (b[j] === US) j++;
    const name = b.toString('utf8', j, e).trim();
    L = getLayer(code, name || (META[code] ? META[code][0] : code));
  }
  const qx = x - ORIGIN[0], qy = y - ORIGIN[1], qz = z - ORIGIN[2];
  let bad = false;
  if (qx % 400 || qy % 400 || qz % 10) bad = true;
  const ix = Math.round(qx / 400), iy = Math.round(qy / 400), iz = Math.round(qz / 10);
  if (ix < 0 || ix >= DIMS[0] || iy < 0 || iy >= DIMS[1] || iz < 0 || iz >= DIMS[2]) bad = true;
  if (bad) { anomalies++; return; }
  if (L.pos + 5 > BATCH) flush(L);
  L.buf.writeUInt16LE(ix, L.pos); L.buf.writeUInt16LE(iy, L.pos + 2); L.buf.writeUInt8(iz, L.pos + 4);
  L.pos += 5; L.count++; total++;
  if (ix < L.minix) L.minix = ix; if (ix > L.maxix) L.maxix = ix;
  if (iy < L.miniy) L.miniy = iy; if (iy > L.maxiy) L.maxiy = iy;
  if (iz < L.miniz) L.miniz = iz; if (iz > L.maxiz) L.maxiz = iz;
}
function parseIntRange(b, s, e) {
  let i = s, neg = false, v = 0;
  if (b[i] === MINUS) { neg = true; i++; }
  for (; i < e; i++) v = v * 10 + (b[i] - D0);
  return neg ? -v : v;
}

while (true) {
  const n = fs.readSync(fd, chunk, 0, CHUNK, null);
  if (n <= 0) break;
  let buf = leftover.length ? Buffer.concat([leftover, chunk.subarray(0, n)]) : chunk.subarray(0, n);
  let start = 0, nl;
  while ((nl = buf.indexOf(NL, start)) !== -1) {
    let end = nl; if (end > start && buf[end - 1] === 13) end--; // strip \r
    if (end > start) processLine(buf, start, end);
    start = nl + 1;
  }
  leftover = Buffer.from(buf.subarray(start));
}
if (leftover.length) { let end = leftover.length; if (end && leftover[end - 1] === 13) end--; if (end > 0) processLine(leftover, 0, end); }
fs.closeSync(fd);

// flush + close all layer files
for (const L of layers.values()) { flush(L); fs.closeSync(L.fd); }

// build manifest
const layerArr = [...layers.values()].map(L => {
  const m = META[L.code] || [L.name, '?', '?'];
  return {
    id: L.code, code: L.code, label: 'GEO_FORMV2: ' + L.code + '_' + L.name,
    name: m[0], group: m[1], age: m[2], color: COLOR[L.code] || '#888888',
    count: L.count, file: 'points/' + L.file, bytes: L.count * 5,
    bbox: { ix: [L.minix, L.maxix], iy: [L.miniy, L.maxiy], iz: [L.miniz, L.maxiz] },
  };
}).sort((a, b) => Number(a.code) - Number(b.code));

const manifest = {
  dataset: 'GRS019 / GSC OF8618 - 3D Paleozoic Bedrock of Southern Ontario',
  source: 'Ontario_BR_Ver1_trim.csv (400x400x10 m point grid)',
  format: 'sparse voxel-index point cloud (.bin + .json)',
  record: { stride: 5, endian: 'little', fields: [
    { name: 'ix', type: 'uint16', bytes: 2 }, { name: 'iy', type: 'uint16', bytes: 2 }, { name: 'iz', type: 'uint8', bytes: 1 } ] },
  grid: { origin: ORIGIN, spacing: SPACING, dims: DIMS,
    crs: 'NAD83 UTM (single extended zone); vertical EGM96',
    worldFromIndex: 'x=origin[0]+ix*spacing[0]; y=origin[1]+iy*spacing[1]; z=origin[2]+iz*spacing[2]' },
  totalPoints: total, anomalies, layerCount: layerArr.length,
  layers: layerArr,
};
fs.writeFileSync(path.join(OUTDIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log('DONE total=' + total + ' anomalies=' + anomalies + ' layers=' + layerArr.length + ' time=' + secs + 's');
