# GRS019 Web Viewer

An interactive 3D web viewer for **GRS019 / GSC OF8618 — 3D Paleozoic Bedrock of
Southern Ontario**. Unlike the `previewer/` (a point-cloud inspection aid), this is
the delivered viewer. It renders **movable volumetric cross-sections** through the
filled-solid model so the interior stratigraphy is visible — the model's key
advantage over a surface-shell representation.

Pure WebGL. No dependencies, no build step, no internet required.

This app is fully self-contained: its data lives in `data/`, so the folder can be
deployed on its own (e.g. Vercel) with nothing else.

## Run
```
cd webviewer
node serve.js
```
Open http://localhost:8090/ in a browser.

## Data used (bundled in `data/`)
- `data/volume_u8.bin.gz` — dense uint8 stratigraphic-ordinal volume (1410 x 996 x 206).
  3.3 MB gzipped; decompressed in the browser via the native `DecompressionStream` API.
- `data/volume.json` — grid header + ordinal -> layer color map.
- `data/manifest.json` — per-layer records (count, bbox, solidity) for the info panel.

Both the cross-section planes and the **3D solids** are generated from this in-memory
volume. Nothing else is fetched, so there is no per-layer network load: enabling a
layer's solid triggers a fast local mesh build (~0.1 s per layer, one layer per frame).

## Controls
- **Left-drag** rotate &middot; **right-drag** pan &middot; **wheel** zoom
- **Vertical exaggeration** — stretch stratigraphy vertically (default 40x; the
  modelled interval is ~2 km thick over a ~560 km wide area).
- **Slice opacity** — fade the cross-section planes.
- **X / Y / Z planes** — each has a checkbox (show/hide) and a slider to sweep the
  cutting plane through the volume. The readout shows UTM easting/northing and EGM96
  elevation of each plane. On load (and refresh) all three planes start **off** and
  **3D solids** start **on**. Activating a plane makes it act as a clip plane on the
  solids: the near (camera-side) part is cut away and only the far part remains, so the
  slice caps the exposed interior of the cut solids.
- **Reset view** / **Outline** (grid bounding box) / **3D solids** — toggle closed,
  lit per-layer surface meshes. Each visible layer is rebuilt as an enclosed body from
  the volume the first time it is shown, then cached. Hidden layers are skipped.
- **Orientation gizmo** (top-right) — a compass plus X/Y/Z axes that rotate with the
  view. Orientation follows the CRS: +X = grid East, +Y = grid North (the red compass
  needle points along +Y, since UTM northing increases north), +Z = Up (elevation).
- **Undo** (below the gizmo) — steps back through visibility, remove, and view-mode
  changes (up to 40 states).
- **Selecting a solid** — with **3D solids** on, click a solid in the scene (or a legend
  row) to select it. The selected body is drawn at 2x brightness and its data appears in
  the right-hand panel (identity, voxel count, UTM extent, elevation range, thickness,
  solidity). **Remove this solid** hides that layer; **Undo** brings it back.
- **Compute volume** (in the selection panel) — the volume is never precomputed;
  clicking the button runs a fresh voxel scan of the selected layer and reports the
  result (voxel count, m3, km3). Cell volume = 400 x 400 x 10 = 1.6e6 m3.
- **Layers by age** — legend grouped Quaternary -> Precambrian. Toggle a single layer,
  a whole age group (click the age header), or all/none. Hidden layers become
  transparent in the cross-sections and are omitted from the 3D overlay.

## Notes
- Requires a browser with `DecompressionStream` (recent Chrome, Edge, Firefox, Safari).
- The decompressed volume is ~276 MB uint8 held in memory; a desktop browser is
  recommended.
- Coordinates are z-up (geological elevation). CRS: NAD83 UTM (single extended zone),
  vertical EGM96. Cross-section colors follow the layer palette in `volume.json`.
