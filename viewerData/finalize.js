// Finalize preprocessing for GRS019 web-viewer data.
//  (1) solidity check: prove each layer is a FILLED solid (contiguous z per column, no internal holes)
//  (2) dense volume: single uint8 stratigraphic-ordinal 3D array (the filled solid, canonical form) + gzip
//  (3) enhance manifest.json with global summary + embedded QA/solidity
//  (4) write DATASET.md catalog
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = 'C:/Users/KimYunMi/Documents/SouthernOntario/viewerData';
const m = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json')));
const [nx, ny, nz] = m.grid.dims, O = m.grid.origin, S = m.grid.spacing;
const NXY = nx * ny, N = NXY * nz;

// stratigraphic ordinal: manifest.layers already sorted asc by code (young -> old)
const codes = m.layers.map(l => l.code);
const ordOf = new Map(); codes.forEach((c, i) => ordOf.set(c, i + 1));

const vol = new Uint8Array(N);          // 0 = empty, else ordinal 1..56  (x-fastest: ix + nx*(iy + ny*iz))
const cmin = new Int16Array(NXY);       // reusable per-column trackers
const cmax = new Int16Array(NXY);
const ccnt = new Int32Array(NXY);
let gminx = 1e9, gmaxx = -1e9, gminy = 1e9, gmaxy = -1e9, gminz = 1e9, gmaxz = -1e9;

for (const L of m.layers) {
  const ord = ordOf.get(L.code);
  const b = fs.readFileSync(path.join(DIR, L.file));
  const touched = [];
  for (let p = 0; p < b.length; p += 5) {
    const ix = b.readUInt16LE(p), iy = b.readUInt16LE(p + 2), iz = b[p + 4];
    vol[ix + nx * (iy + ny * iz)] = ord;
    const col = iy * nx + ix;
    if (ccnt[col] === 0) { cmin[col] = iz; cmax[col] = iz; touched.push(col); }
    else { if (iz < cmin[col]) cmin[col] = iz; if (iz > cmax[col]) cmax[col] = iz; }
    ccnt[col]++;
    if (ix < gminx) gminx = ix; if (ix > gmaxx) gmaxx = ix;
    if (iy < gminy) gminy = iy; if (iy > gmaxy) gmaxy = iy;
    if (iz < gminz) gminz = iz; if (iz > gmaxz) gmaxz = iz;
  }
  let interval = 0, solidCols = 0, holeVox = 0;
  for (const col of touched) {
    const iv = cmax[col] - cmin[col] + 1;
    interval += iv;
    if (ccnt[col] === iv) solidCols++; else holeVox += iv - ccnt[col];
    ccnt[col] = 0; // reset for next layer
  }
  L.solidity = {
    columns: touched.length, solidColumns: solidCols,
    filledVoxels: L.count, columnIntervalVoxels: interval,
    internalHoleVoxels: holeVox,
    solidityPct: +(100 * L.count / interval).toFixed(3),
    solidColumnPct: +(100 * solidCols / touched.length).toFixed(3),
  };
}

// ---- write dense volume (gzip) ----
const VDIR = path.join(DIR, 'volume');
if (!fs.existsSync(VDIR)) fs.mkdirSync(VDIR, { recursive: true });
const gz = zlib.gzipSync(Buffer.from(vol.buffer), { level: 6 });
fs.writeFileSync(path.join(VDIR, 'volume_u8.bin.gz'), gz);
const volMeta = {
  description: 'Dense stratigraphic-ordinal volume (FILLED solid). uint8 per voxel; 0=empty, 1..' + codes.length + '=layer ordinal.',
  encoding: 'raw uint8, x-fastest: index = ix + nx*(iy + ny*iz), gzip-compressed',
  dims: [nx, ny, nz], origin: O, spacing: S, empty: 0,
  bytesRaw: N, bytesGz: gz.length,
  ordinalToLayer: m.layers.map((l, i) => ({ ordinal: i + 1, code: l.code, name: l.name, age: l.age, group: l.group, color: l.color })),
};
fs.writeFileSync(path.join(VDIR, 'volume.json'), JSON.stringify(volMeta, null, 2));

// ---- global + solidity summary ----
const occ = m.totalPoints, frac = occ / N;
let totInterval = 0, totHole = 0, totSolidCols = 0, totCols = 0;
for (const L of m.layers) { const s = L.solidity; totInterval += s.columnIntervalVoxels; totHole += s.internalHoleVoxels; totSolidCols += s.solidColumns; totCols += s.columns; }
const ages = {};
for (const L of m.layers) { (ages[L.age] ||= { layers: 0, points: 0 }); ages[L.age].layers++; ages[L.age].points += L.count; }

m.summary = {
  totalPoints: occ, gridCells: N, occupiedVoxelFraction: +frac.toFixed(4),
  worldBBox: {
    x: [O[0] + gminx * S[0], O[0] + gmaxx * S[0]],
    y: [O[1] + gminy * S[1], O[1] + gmaxy * S[1]],
    z: [O[2] + gminz * S[2], O[2] + gmaxz * S[2]],
  },
  indexBBox: { ix: [gminx, gmaxx], iy: [gminy, gmaxy], iz: [gminz, gmaxz] },
  units: 'meters (NAD83 UTM easting/northing; EGM96 elevation)',
  ageSummary: ages,
};
const qaReportPath = path.join(DIR, 'geo_qa_report.json');
const qa = fs.existsSync(qaReportPath) ? JSON.parse(fs.readFileSync(qaReportPath)) : null;
m.qa = {
  overlapCollisions: qa ? qa.overlap_collisions : null,
  superpositionInversions: qa ? qa.inversion_voxel_pairs : null,
  occupiedColumns: qa ? qa.occupiedColumns : totCols,
  solidity: {
    filledVoxels: occ, columnIntervalVoxels: totInterval, internalHoleVoxels: totHole,
    overallSolidityPct: +(100 * occ / totInterval).toFixed(3),
    solidColumnPct: +(100 * totSolidCols / totCols).toFixed(3),
    note: 'solidityPct ~100 confirms layers are filled solids (contiguous interior), not hollow shells.',
  },
  faults: 'none — GRS019 explicitly has no representation of mapped faults (report p.29/30); conformable layer-cake.',
};
m.products = {
  'manifest.json': 'grid metadata + 56 layer records + summary + qa (this file)',
  'points/*.bin': 'per-layer sparse voxel-index points (ix:u16, iy:u16, iz:u8 = 5 B/pt) — filled solid as points',
  'volume/volume_u8.bin.gz': 'dense uint8 stratigraphic-ordinal volume (filled solid, canonical) — for slicing / volume rendering',
  'volume/volume.json': 'volume header + ordinal->layer map',
  'geo_qa_report.json': 'overlap & superposition integrity check',
};
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(m, null, 2));

console.log(JSON.stringify({
  volumeRawMB: +(N / 1048576).toFixed(1), volumeGzMB: +(gz.length / 1048576).toFixed(1),
  overallSolidityPct: m.qa.solidity.overallSolidityPct, solidColumnPct: m.qa.solidity.solidColumnPct,
  internalHoleVoxels: totHole, occupiedVoxelFraction: m.summary.occupiedVoxelFraction,
}, null, 2));
