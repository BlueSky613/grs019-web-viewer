# GRS019 — 3D Paleozoic Bedrock of Southern Ontario (Web Viewer)

Interactive 3D web viewer for **GRS019 / GSC Open File 8618 — A Three-Dimensional
Geological Model of the Paleozoic Bedrock of Southern Ontario** (OGS/GSC, 2019).

Pure WebGL, no dependencies, no build step. It renders the 56-layer filled-solid model
as **closed, lit per-layer solids** and as **movable volumetric cross-sections** that
reveal the interior stratigraphy.

## Live viewer

Deployed on Vercel — the root path redirects to `/webviewer/`.

## Repository layout

| Path | What |
|---|---|
| `webviewer/` | the delivered web viewer (`index.html`, `favicon.svg`, `serve.js`, `README.md`) |
| `viewerData/volume/` | dense uint8 stratigraphic-ordinal volume (`volume_u8.bin.gz`, 3.3 MB) + header |
| `viewerData/manifest.json` | per-layer records (code, name, age, group, color, count, bbox, solidity) |
| `previewer/` | a lightweight point-cloud inspection aid (separate from the viewer) |

The web viewer reads only `viewerData/volume/` and `viewerData/manifest.json`, so the
whole app is a few MB.

## Excluded from the repository

`viewerData/points/` (563 MB of full-resolution per-layer points) is **not committed** —
its largest file exceeds GitHub's 100 MB limit and the viewer does not use it. Regenerate
it from the source grid if needed; the volume in `viewerData/volume/` is the canonical,
lossless filled-solid representation.

## Run locally

```
cd webviewer
node serve.js
```
Open http://localhost:8090/webviewer/

## Features

- Closed, lit 3D solids per layer, built on the fly from the volume (no per-layer download).
- X / Y / Z cross-section planes; activating a plane clips the near half of the solids so
  the slice caps the exposed interior.
- Orientation gizmo (compass + XYZ axes): +X = grid East, +Y = grid North, +Z = Up
  (NAD83 UTM, vertical EGM96).
- Click to select a solid (highlighted at 2x brightness); right panel shows its data,
  an on-demand **volume** computation, and a **remove** action; **undo** reverts changes.

## Source data

GRS019 / GSC OF8618, derived from the released `Ontario_BR_Ver1_trim.csv`
(400 x 400 x 10 m sampled point grid). NAD83 UTM (single extended zone), vertical EGM96.
