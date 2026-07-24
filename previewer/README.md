# GRS019 Previewer (primary-data inspection)

A lightweight preview tool for **visually inspecting** the preprocessing output
(`viewerData/`) so the next direction can be decided. This is an inspection aid,
NOT the final web viewer. No dependencies, no internet required (pure WebGL).

## Run
```
cd previewer
node serve.js
```
Open http://localhost:8080 in a browser.

## Controls
- Left-drag: rotate / Right-drag: pan / Wheel: zoom
- Vertical exaggeration slider: stretch stratigraphy vertically to reveal layering (default 40x)
- Point size slider / Reset view / All on / All off
- Left panel: layers grouped by age (Quaternary -> Precambrian), per-layer checkbox, color, point count

## Contents
- `index.html` — pure WebGL point previewer
- `serve.js` — dependency-free local static server
- `preview_manifest.json` — preview metadata (center, bounds, 56 layers)
- `data/*.bin` — per-layer Float32 LOCAL xyz (display-only subsample, max 50,000 pts/layer)
- `make_preview.js` — regenerate preview data from `viewerData/`

## Notes
- `data/` is a **display-only downsample** (~2.53M pts total, 30 MB). The authoritative
  full-resolution data lives in `../viewerData/points/` (117.9M pts).
- Coordinates are z-up (geological z = elevation). Positions are LOCAL meters relative to the grid center.
- To rebuild the preview data: `node make_preview.js`, then restart the server.
