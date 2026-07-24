// Geological integrity QA on generated .bin layers:
//  (1) overlap: no voxel may belong to two layers
//  (2) superposition: within each (x,y) column, ordinals top->down non-decreasing
const fs = require('fs'), path = require('path');
const DIR = 'C:/Users/KimYunMi/Documents/SouthernOntario/viewerData';
const m = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json')));
const [nx, ny, nz] = m.grid.dims;
const N = nx * ny * nz;
const codes = m.layers.map(l => l.code); // manifest is sorted asc (young -> old)
const ord = new Map(); codes.forEach((c, i) => ord.set(c, i + 1));
const owner = new Uint8Array(N);
let collisions = 0; const collPairs = new Map(); const collEx = [];
for (const L of m.layers) {
  const o = ord.get(L.code);
  const b = fs.readFileSync(path.join(DIR, L.file));
  for (let p = 0; p < b.length; p += 5) {
    const ix = b.readUInt16LE(p), iy = b.readUInt16LE(p + 2), iz = b[p + 4];
    const idx = (iz * ny + iy) * nx + ix;
    if (owner[idx] !== 0) {
      collisions++;
      const a = owner[idx]; const key = (a < o ? a + '-' + o : o + '-' + a);
      collPairs.set(key, (collPairs.get(key) || 0) + 1);
      if (collEx.length < 5) collEx.push({ ix, iy, iz, between: [codes[a - 1], L.code] });
    } else owner[idx] = o;
  }
}
let cols = 0, colsWithInv = 0, invPairs = 0; const invEx = [];
for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) {
  let prev = 0, has = false, invHere = false;
  for (let iz = nz - 1; iz >= 0; iz--) {
    const o = owner[(iz * ny + iy) * nx + ix];
    if (o === 0) continue;
    has = true;
    if (prev !== 0 && o < prev) { invPairs++; invHere = true; if (invEx.length < 6) invEx.push({ ix, iy, iz, upper: codes[prev - 1], lower: codes[o - 1] }); }
    prev = o;
  }
  if (has) { cols++; if (invHere) colsWithInv++; }
}
console.log(JSON.stringify({
  totalVoxelsChecked: m.totalPoints,
  gridCells: N,
  overlap_collisions: collisions,
  overlap_layerPairs: [...collPairs.entries()].map(([k, v]) => ({ pair: k, count: v })).slice(0, 20),
  overlap_examples: collEx,
  occupiedColumns: cols,
  columns_with_superposition_inversion: colsWithInv,
  inversion_voxel_pairs: invPairs,
  inversion_rate_pct: cols ? +(100 * colsWithInv / cols).toFixed(4) : 0,
  inversion_examples: invEx,
}, null, 2));
