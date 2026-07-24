# viewerData — Preprocessed data for the GRS019 3D web viewer

Source: **GRS019 / GSC Open File 8618** — *A Three-Dimensional Geological Model of the
Paleozoic Bedrock of Southern Ontario* (OGS/GSC, 2019). Derived from the released
`Ontario_BR_Ver1_trim.csv` (400 x 400 x 10 m sampled point grid). DXF is not used.

This directory is the **finished preprocessing stage** — everything a web viewer needs,
before any viewer is written. All coordinates and derived products are lossless with
respect to the source grid (no interpolation, no resampling).

## Key property: FILLED solid (not a shell)

Each modelled layer is a **fully filled volumetric solid**, not a hollow surface hull.
Verified over all 117,909,004 voxels:

| Check | Result |
|---|---|
| Overall solidity (filled / column-interval voxels) | **100.000 %** |
| Solid columns (contiguous z, no internal gap) | **100 %** |
| Internal hole voxels | **0** |
| Layer overlap collisions (one voxel = one unit) | **0** |
| Superposition inversions (older never above younger) | **0** |
| Mapped faults in source model | none (conformable layer-cake) |

Because the interior is fully populated, the data supports true volume rendering and
**arbitrary cross-sections that reveal filled interiors** — the main advantage over a
surface-shell (DXF) representation.

## Grid

| | |
|---|---|
| dims (nx, ny, nz) | 1410 x 996 x 206 = 289,298,160 cells |
| origin (x, y, z) | 322400, 4615200, -1520 (m) |
| spacing | 400, 400, 10 (m) |
| occupied voxels | 117,909,004 (40.76 %) |
| CRS | NAD83 UTM (single extended zone); vertical EGM96 |
| world from index | x = origin[0] + ix*spacing[0]; y = origin[1] + iy*spacing[1]; z = origin[2] + iz*spacing[2] |

## Products

| Path | What | Size |
|---|---|---|
| `manifest.json` | grid metadata + 56 layer records (code, name, group, age, color, count, bbox, solidity) + global summary + embedded QA | ~40 KB |
| `points/*.bin` | per-layer sparse voxel points; record = `ix`:uint16, `iy`:uint16, `iz`:uint8 (5 B/pt), little-endian; **filled solid as points** | 563 MB total |
| `volume/volume_u8.bin.gz` | dense uint8 stratigraphic-ordinal volume; 0 = empty, 1..56 = layer ordinal (young->old); x-fastest `ix + nx*(iy + ny*iz)`; **canonical filled solid** for slicing / volume rendering | **3.3 MB** (275.9 MB raw) |
| `volume/volume.json` | volume header + ordinal -> layer map | ~9 KB |
| `geo_qa_report.json` | overlap & superposition integrity report | — |
| `build_points.js` | CSV -> points/*.bin + manifest.json | — |
| `geo_qa.js` | geological integrity gate (overlap, superposition) | — |
| `finalize.js` | solidity check + dense volume + manifest finalize | — |

## Two representations, same data

- **points/** — 56 lightweight per-layer files; ideal for progressive per-layer loading
  and point / instanced-voxel rendering. Large in bytes (explicit coordinates).
- **volume/** — one 3.3 MB gzipped array; ideal for slicing, volume rendering, and any
  operation needing the filled interior. Decompresses to 276 MB uint8 in memory.

Both are lossless and mutually consistent; a viewer may use either or both.

## Layers

56 model layers = 54 Paleozoic bedrock layers + Precambrian basement + Quaternary
overburden, spanning Quaternary, Devonian, Silurian, Ordovician, Cambrian, Precambrian.
Layer code prefix encodes age (0 = Quaternary, 3 = Devonian, 4 = Silurian,
5 = Ordovician, 6 = Cambrian, 7 = Precambrian). See `manifest.json` `layers[]`.

## Integrity gates (re-run after any transform)

```
node geo_qa.js         # must report overlap_collisions = 0 and inversion_voxel_pairs = 0
node finalize.js       # must report overallSolidityPct = 100, internalHoleVoxels = 0
```

## Preservation rules for downstream steps

1. Never fill data gaps by interpolation (real absences / pinchouts are geology).
2. Keep one-voxel-one-unit (no overlap) and superposition ordering intact.
3. Honor the Precambrian unconformity and subcrop edges; do not weld across them.
4. No fabricated faults — the source model has none.
