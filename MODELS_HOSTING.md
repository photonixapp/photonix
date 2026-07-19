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

| file | sha256 | size |
|---|---|---|
| `object.onnx` | `21f811bd3d8c4d3c9d0b08a28a25c00026cb64d6f5eb0bf74bf40a79d393f80c` | 68,168,904 B |
| `object.onnx.xz` (host this, `decompress: true`) | `b19ccb12344f92327f9bebb58cb303fc824198c6ec0628c3644f777c8ce4a5d8` | 52,113,756 B |

- `oid_v4_label_map.pbtxt` — unchanged, already hosted
  (`49147a2f9864544a89708f37492d216fbeaa30b2b4b0bb2f967b6d7a851cec32`).
- The legacy frozen `.pb` stops being referenced from version 20260719 on.

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
their README. Immich and others redistribute these same files regardless
(and SCRFD/MobileFaceNet training recipes are Apache-2.0), but hosting them
on photonix.org is a distribution decision to make consciously. Alternatives
if declined: train from the Apache recipes, or keep the (worse, larger)
MTCNN+FaceNet stack for the default and make buffalo_s an opt-in download.

## clip — semantic search analyzer (new, opt-in; ViT-B/32 OpenAI weights, MIT)

Source: `https://huggingface.co/immich-app/ViT-B-32__openai` (MIT license —
chosen over MobileCLIP/MobileCLIP2 which are `apple-amlr`, research-only).
Quantization/conversion done locally (onnxruntime `quantize_dynamic` for the
visual encoder; fp16 via onnxconverter-common for the textual encoder —
textual int8 was rejected: prompt-embedding cosine dropped to 0.88-0.93 vs
fp32, while visual int8 keeps 0.96-0.99 image cosine and identical top-1
retrieval on the bench set).

| file | precision | size | notes |
|---|---|---|---|
| `visual.int8.onnx` | int8 | ~89 MB | per-photo image encoder (15-43 ms/image on 8-core CPU) |
| `textual.fp16.onnx` | fp16 | ~127 MB | per-query text encoder |
| `vocab.json` + `merges.txt` | - | ~1.4 MB | CLIP BPE tokenizer data |

(sha256s recorded when the Tier 5 integration lands; final filenames may
differ — see photonix/classifiers/clip when merged.)
