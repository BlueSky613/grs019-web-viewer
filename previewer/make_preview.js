// Build lightweight preview data from viewerData/points/*.bin
// - uniform stride subsample (max CAP points/layer) -> Float32 LOCAL xyz (meters, centered)
// - preview only; authoritative full-res data stays in viewerData/
const fs = require('fs'), path = require('path');
const SRC = 'C:/Users/KimYunMi/Documents/SouthernOntario/viewerData';
const OUT = 'C:/Users/KimYunMi/Documents/SouthernOntario/previewer';
const DATA = path.join(OUT, 'data');
const CAP = 50000;

const m = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json')));
const O = m.grid.origin, S = m.grid.spacing;

// global occupied bbox (index space) -> world center
let gminx = 1e9, gmaxx = -1e9, gminy = 1e9, gmaxy = -1e9, gminz = 1e9, gmaxz = -1e9;
for (const L of m.layers) {
  gminx = Math.min(gminx, L.bbox.ix[0]); gmaxx = Math.max(gmaxx, L.bbox.ix[1]);
  gminy = Math.min(gminy, L.bbox.iy[0]); gmaxy = Math.max(gmaxy, L.bbox.iy[1]);
  gminz = Math.min(gminz, L.bbox.iz[0]); gmaxz = Math.max(gmaxz, L.bbox.iz[1]);
}
const wminx = O[0] + gminx * S[0], wmaxx = O[0] + gmaxx * S[0];
const wminy = O[1] + gminy * S[1], wmaxy = O[1] + gmaxy * S[1];
const wminz = O[2] + gminz * S[2], wmaxz = O[2] + gmaxz * S[2];
const C = [(wminx + wmaxx) / 2, (wminy + wmaxy) / 2, (wminz + wmaxz) / 2];

const outLayers = [];
for (const L of m.layers) {
  const b = fs.readFileSync(path.join(SRC, L.file));
  const n = L.count;
  const stride = Math.max(1, Math.floor(n / CAP));
  const sampled = Math.ceil(n / stride);
  const pos = new Float32Array(sampled * 3);
  let k = 0;
  for (let i = 0; i < n; i += stride) {
    const p = i * 5;
    const ix = b.readUInt16LE(p), iy = b.readUInt16LE(p + 2), iz = b[p + 4];
    pos[k++] = O[0] + ix * S[0] - C[0];
    pos[k++] = O[1] + iy * S[1] - C[1];
    pos[k++] = O[2] + iz * S[2] - C[2];
  }
  const realN = k / 3;
  const file = 'data/' + L.code + '.bin';
  fs.writeFileSync(path.join(DATA, L.code + '.bin'), Buffer.from(pos.buffer, 0, realN * 12));
  outLayers.push({ code: L.code, name: L.name, group: L.group, age: L.age, color: L.color,
    fullCount: n, previewCount: realN, file });
}

const pm = {
  dataset: m.dataset,
  note: 'PREVIEW subsample (max ' + CAP + ' pts/layer). Positions = LOCAL meters (world - center). Authoritative full data in viewerData/.',
  center: C,
  worldBounds: { x: [wminx, wmaxx], y: [wminy, wmaxy], z: [wminz, wmaxz] },
  localBounds: { x: [wminx - C[0], wmaxx - C[0]], y: [wminy - C[1], wmaxy - C[1]], z: [wminz - C[2], wmaxz - C[2]] },
  ageOrder: ['Quaternary', 'Devonian', 'Silurian', 'Ordovician', 'Cambrian', 'Precambrian'],
  layers: outLayers,
};
fs.writeFileSync(path.join(OUT, 'preview_manifest.json'), JSON.stringify(pm, null, 2));

let tot = 0; outLayers.forEach(l => tot += l.previewCount);
console.log('preview layers=' + outLayers.length + ' totalPreviewPts=' + tot + ' center=' + C.map(v => v.toFixed(0)));
