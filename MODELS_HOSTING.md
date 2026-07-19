# Model files to host for the `ml-improvement` branch

Weights are NOT committed to git. The files below need uploading to the
models server (photonix.org / epixstudios filer mirrors) and adding to
`models.json` before this branch ships. Everything was generated or fetched
reproducibly — commands referenced per section. All version numbers are
`20260719`.

Local copies of every file listed here are already in place under
`data/models/` on the dev machine (placed manually with matching
`version.txt` so `BaseModel.ensure_downloaded` short-circuits without a
manifest entry during development).

## location — replaces cities1000.txt (28 MB download → ~7.5 MB)

Built by `scripts/build_location_cities.py` from GeoNames `cities1000.txt`
(exact parity verified: 5,324-point grid sweep + all test coords, 0
mismatches; load 6.7x faster, ~5.8x less RAM).

| file | sha256 | size |
|---|---|---|
| `cities.bin` (uncompressed) | `98ece4783e9c56b10a03ba12a81fbbb42d52ad73e2f6cd558f48058453da6ecb` | 4,521,859 B |
| `cities.bin.xz` (host this) | `f95811193af4ddd9f5aacd7ee14d0401059062c7ee4a7803f0dfe6ca3a81402e` | 1,640,240 B |

models.json `location.20260719.files`: the two existing `TM_WORLD_BORDERS-0.3.{shp,dbf}.xz`
entries unchanged + `cities.bin.xz` (`decompress: true`, sha256 of the
compressed bytes per the existing convention). `cities1000.txt` is no longer
referenced.

## object — SSD MobileNet v2 OID v4 converted to ONNX (fp32)

Converted by `scripts/convert_models_to_onnx.py` (tf2onnx 1.16.1, opset 13)
with TF-vs-ORT parity verified on the bench set. **int8 dynamic quantization
was tested and REJECTED** — it drops most detections (e.g. the dog photo
loses its only detection) with no CPU win; revisit later with static QDQ +
calibration if download size matters.

The first conversion kept the graph's control-flow NMS and ORT took ~65 s to
initialise the session (fatal for the lazy-load/idle-unload lifecycle), so
the shipped artifact is a **backbone-only graph** (`--backbone` mode in the
conversion script) with box decode + NMS re-implemented in vectorised numpy
inside ObjectModel — detections byte-identical to the full graph on the
parity set, session init 0.19 s (~340× faster), warm predict ~0.10 s.

| file | sha256 | size | xz size |
|---|---|---|---|
| `object_backbone.onnx` (host the .xz, `decompress: true`) | `9c4735d89a1bfcd40a78b84a61d2a4b1f6b9c08d00199af2d03eb3416d7b0131` | 57,696,267 B | 51,875,164 B (xz sha256 needed at upload) |
| `object_anchors.npy` | `8b619ef82f04f88cf65384c612b8eda72df71c980af510356c924dc6528aaac2` | 30,800 B | 2,512 B |

- `oid_v4_label_map.pbtxt` — unchanged, already hosted
  (`49147a2f9864544a89708f37492d216fbeaa30b2b4b0bb2f967b6d7a851cec32`).
- The intermediate full `object.onnx` and the legacy frozen `.pb` stop being
  referenced from version 20260719 on (both kept on the dev disk only).

## style — retrained MobileNet graph converted to ONNX (fp32)

Same conversion pipeline (`--use_default input_1/BottleneckInputPlaceholder`
for the tensorflow-for-poets bottleneck node). Same-input parity is exact
(max logit diff 0.00000); the PIL preprocessing that replaces TF decode
shifts scores by ≤0.07 with top-1 preserved on real photos. int8 rejected
(top-1 flips).

| file | sha256 | size |
|---|---|---|
| `style.onnx` | `eda43bf739c1435e878e8c4960d6ab837efc1d4e811dd066602ef3dd0d9bdd13` | 17,017,297 B |
| `style.onnx.xz` (host this, `decompress: true`) | `24e66a97ee24dada572ce41accf9613e2afef2ef9d477bfe2d1862e483f2ae4b` | 15,720,248 B |

- `labels.txt` — unchanged, already hosted
  (`b9336a342ce3a93d7013f5c90d428bc6b8113cc0cec33ce382037099f429225e`).

## face — InsightFace buffalo_s pair (replaces MTCNN + FaceNet, 91 MB → ~15 MB)

Fetched from the official InsightFace v0.7 release bundle
(`https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_s.zip`);
only 2 of the 5 bundled files are used.

| file | sha256 | size | xz size |
|---|---|---|---|
| `det_500m.onnx` (SCRFD-500M detector) | `5e4447f50245bbd7966bd6c0fa52938c61474a04ec7def48753668a9d8b4ea3a` | 2,524,817 B | 2,319,164 B |
| `w600k_mbf.onnx` (MobileFaceNet/ArcFace recognizer, 512-D) | `9cc6e4a75f0e2bf0b1aed94578f144d15175f357bdc05e815e5c4a02b319eb4f` | 13,616,099 B | 12,565,960 B |

**LICENSE FLAG (needs Damian's decision before release):** InsightFace's
python library code is MIT, but the insightface project states the bundled
pre-trained model weights are "for non-commercial research purposes" in
their README (maintainer-confirmed in deepinsight/insightface#2022).
Research into what peers do (2026-07):

- **Immich** redistributes buffalo_l via `immich-app/buffalo_l` on HF with
  **written permission obtained by email (2023-03-18)** — and their README
  explicitly says that permission does *not* extend to redistribution by
  third parties, so it provides no cover for photonix.org hosting.
- **LibrePhotos** migrated dlib→InsightFace in 2026 and ships `buffalo_sc`
  (the same SCRFD-500M + w600k MBF weights) with no permission statement;
  **PhotoPrism** serves an SCRFD 0.5g detector from its own download server.
  No takedowns of the buffalo packs were found, but InsightFace now runs a
  commercial licensing business (insightface.ai) and has withdrawn/relicensed
  other models (inswapper).

Recommended path: email InsightFace for the same written permission Immich
obtained before hosting on photonix.org. Fallbacks if declined: OpenCV Zoo's
**YuNet** detector (MIT) + **SFace** recognizer (Apache-2.0) are the only
genuinely permissive pretrained stack of adjacent quality (SFace is
measurably weaker than ArcFace w600k); or train from the Apache-2.0 recipes.

## clip — semantic search analyzer (new, opt-in; ViT-B/32 OpenAI weights, MIT)

Source: `https://huggingface.co/immich-app/ViT-B-32__openai` (MIT license —
chosen over MobileCLIP/MobileCLIP2 which are `apple-amlr`, research-only).
Visual encoder int8-quantized locally (`quantize_dynamic`): image-embedding
cosine 0.96-0.99 vs fp32, identical top-1 retrieval on the bench set,
15-43 ms/image on an 8-core CPU. **Textual encoder ships fp32** — every
quantization tested degraded it (full int8: prompt cosine 0.88-0.93;
MatMul-only int8: min cosine 0.76, nearest-prompt stability 5/10) and both
fp16 conversion attempts produced invalid graphs (onnxconverter-common Cast
type errors) or ran >50 min in shape inference. Text encoding runs once per
search query, so fp32 costs only download size, not runtime.

| file | precision | size | sha256 |
|---|---|---|---|
| `visual.int8.onnx` | int8 | 88,700,750 B | `0e968749cecf0de1e987b801dc7a70db597a7b8ab5667c79a78a510b140faa51` |
| `textual.onnx` | fp32 | 254,193,396 B | `b80cf0af751533a6712d92247f0ddc0c95208748bc59a1a27f33e67be6864e3b` |
| `vocab.json` | - | 862,328 B | `5047b556ce86ccaf6aa22b3ffccfc52d391ea4accdab9c2f2407da5b742d4363` |
| `merges.txt` | - | 524,619 B | `9fd691f7c8039210e0fced15865466c65820d09b63988b0174bfe25de299051a` |

Total download ~344 MB raw (xz will trim the fp32 textual somewhat) —
disclosed in the UI as the largest optional download.

Research notes for future revisions (2026-07):

- The model choice is validated: ViT-B/32 OpenAI is still Immich's default
  smart-search model in 2026. MobileCLIP2 remains `apple-amlr`
  research-only, and Apple's DFN CLIP models carry the same research-only
  LICENSE text despite misleading `apple-sample-code-license` metadata.
- **fp16 textual encoder is a solved problem** and would cut the download
  ~127 MB: Xenova ships a known-good CPU-valid fp16 text encoder ONNX
  (`Xenova/clip-vit-base-patch32/onnx/text_model_fp16.onnx`, 127 MB; also an
  int8 at 64 MB used by transformers.js). If re-converting ourselves, the
  earlier invalid-graph failures were likely missing
  `disable_shape_infer=True` alongside `keep_io_types=True` in
  `onnxconverter_common.float16`. Note ORT's CPU EP computes fp16 via fp32
  casts, so this is purely a download-size win — fine for a per-query
  encoder. Verify retrieval parity on the bench set before adopting.
- Same-size quality bump candidate: `laion/CLIP-ViT-B-32-laion2B-s34B-b79K`
  (MIT, 66.6% IN zero-shot vs OpenAI's 63.3%) — drop-in architecture, would
  need the int8-visual verification redone.
- Bigger opt-in tier candidate: SigLIP2 B/16 (Apache-2.0, immich-app hosts
  ONNX exports) — materially better retrieval but ~3-4x the download (256k
  multilingual vocab makes the text tower huge).
