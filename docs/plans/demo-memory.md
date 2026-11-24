# Demo instance is OOM-killed at 6 GiB; run it on stored analysis results and add a low-memory mode

**Status:** In progress · **Ticket:** [#515](https://github.com/photonixapp/photonix/issues/515) · **Date:** 2026-11-24

The public demo at demo.photonix.org holds 14 photos, yet on 2026-11-24 its pod sat at about
3.5 GB working set while idle, jumped to 5.2–5.4 GB inside one minute at 10:26 UTC, and was
OOM-killed twice. The node is an 8 GB cx33 shared with mail, MariaDB and a Postgres replica; the
kernel OOM killer fired before the pod's 6 GiB cgroup limit did, the kubelet went NotReady, and
other services on the node went down. The founder scaled the Deployment to 0 by hand
(`kubectl scale`, about 10:41 UTC), so **the demo is currently offline**.

Three things cause it. First, the container always runs about 23 Python processes: 8 gunicorn
workers (`system/run_app_server.sh:8`) plus 15 supervisord programs
(`system/supervisord.conf:16-179`), seven of them classifier processes that each import Django
and, once used, TensorFlow. Second, nothing stops the demo from running real analysis: every
pod start queues thumbnails for all photos (`housekeeping.py:35-41`), which chain into all
classifiers because the only guard against re-analysis is the existence of a `classify_images`
task row (`photos/utils/thumbnails.py:46-50`), and the object model alone declares 2,000 MB
(`classifiers/object/model.py:29`). Third, the 15-minute reset is a Kubernetes CronJob in
`epix-infra` replaying a January 2026 SQL dump that no longer matches the schema: all 126 task
rows fail (`null value in column "priority"`), the job still prints "reset complete", and the
dump itself contains 14 pending `classify.object` tasks and no object or event tags at all.

This plan makes the demo serve **stored analysis results** from a fixture shipped in the image,
with no classifier processes and no persistent volume, reset by a `reset_demo` management
command that the infra CronJob calls. It also gives every install a **low-memory mode** (one
classifier process instead of seven, memory really released after idle) and documented memory
requirements, which is the general half of the ticket.

---

## Progress log

Implementing agents: append one line here per completed milestone (date, milestone, commit),
and tick the checkboxes in place. Keep milestone order — each is independently committable.
If reality forces a deviation from the design, record it here with the reason — never
silently implement something else.

<!-- - YYYY-MM-DD — M1: <one-line summary> — commit <hash> -->
- 2026-11-24 — M1: process layouts split (core / classification), `GUNICORN_WORKERS`, Vite idles outside dev, `memory_report.sh` — commit 3990f2ff.
  Baseline (deviation: measured on CI image `photonixapp/photonix:edge` with this branch's `system/` bind-mounted, not a local prd build — host had ~6 GB RAM / 29 GB disk free; cgroup `memory.current`, includes page cache):
  (a) default idle, 16 programs, 8 gunicorn workers: **1299 MB** (each classifier process ~75–88 MB before any model, each gunicorn worker 51 MB);
  (b) default while analysing 10 demo photos: **6142 MB, at the 6g limit**, repeated OOM kills (face 2172 MB RSS, style 1318, thumbnail_processor 633 and earlier 1.6 GB, color 529, location 447, event 306, object 240), 15 face/object tasks left stuck in `S`;
  (c) default 10 min after analysis: **5237 MB — nothing released** (style 1316, face 1232, thumbnail 631, location 546, color 388, event 269);
  (d) `CLASSIFICATION_DISABLED=1 GUNICORN_WORKERS=2` idle: **643 MB**, 8 programs, Vite RUNNING with one start.
  New finding: `thumbnail_processor` (workers = `cpu_count()/2`, `thumbnail_processor.py:44`) reached ~1.6 GB RSS on full-size originals and was OOM-killed at 4g before any classifier ran. Plan amended: M2 must prove startup queues no thumbnail tasks after `reset_demo`, and M5 adds `THUMBNAIL_WORKERS` (1 under `LOW_MEMORY` and in the demo).
- 2026-11-24 — M2: `reset_demo` / `export_demo_fixture` commands, `photos/utils/demo.py`, stored outputs at startup under `CLASSIFICATION_DISABLED=1` — commit 5aaf24c5. Deviations (review findings): stored outputs load only when `DEMO` is on and `ENV` is not `dev` (a real install with `SAMPLE_DATA=1 CLASSIFICATION_DISABLED=1` would otherwise be wiped); `reset_demo` also refuses under `ENV=dev` unless `--allow-dev` (the dev compose stack has `DEMO=1`); a startup reset failure is logged and the pod still starts (the CronJob command still exits non-zero); downloads use their own timeout + status check + image verify instead of `fs.download_file`, re-fetch invalid files and clear stale temp files; mtimes are pinned only on the stored-outputs path so dev files are untouched; the test fixture uses `/data/photos/<demo basename>` paths rewritten to a tmp dir rather than `snow.jpg` paths. Gate: 179 passed; the 1 failure is `test_annoy_index` in the untracked `tests/test_classifier_faces.py`, outside this branch.
- 2026-11-24 — M3: four CC face photos (2+2+2+1 faces, one with a husky) and the real fixture `photos/demo/demo_library.json` (14 photos, 35 tags: colour, object incl. Dog, location, style, 7 faces / 6 embeddings; no event tags found) — commit 7b8c8eb3. Deviations: "Couple of Grins" uses the `_k` 2048px rendition, not `_o_d` (the original has a wrong EXIF orientation tag), with `taken_at` set from the original's EXIF; the five generic keyword tags from the CC0 selfie were stripped (they included private first names) and a test forbids type-G tags; the fixture was generated by driving each classifier serially in throwaway containers, not under supervisord, because the object classifier needed 2.2–3.0 GB RSS per full-size photo (`approx_ram_mb` says 2000) — relevant to M4/M5 limits. The original ten photos are the founder's own Flickr uploads (CC BY-SA 2.0), now credited in the README.
- 2026-11-24 — M3a (added after the M3 walkthrough): JPEG reduced-scale decode in `get_thumbnail` — commit 41009692. One 256 accurate thumbnail of a 5472×3648 demo photo: process RSS 85.9 → 1161 MB before, 87.0 → 156.6 MB after. Demo stack (`--memory=2g`, cold thumbnail cache): before, 3 OOM kills and `memory.peak` at the 2 GiB limit; after, 14/14 thumbnails, `oom_kill` 0, `memory.peak` 838 MiB. Output differs from the old thumbnails by mean 0.88/255 per pixel; `THUMBNAILER_VERSION` unchanged.
- 2026-11-24 — M3 walkthrough (Playwright, isolated demo stack: `:edge` image + this branch's `photonix/` and `system/` mounted, `DEMO=1 CLASSIFICATION_DISABLED=1 GUNICORN_WORKERS=2`, `--memory=2g`, empty data volume): start-up downloads 14 photos and loads the fixture in ~3 s, idle 299 MB; login demo/demo, timeline 14/14 thumbnails; husky photo shows face box, Dog and Glasses. Rotated a photo and added a tag, ran `manage.py reset_demo` (exit 0): both gone, 14/14 thumbnails still load, supervisord runs 8 core programs and no classifier, cgroup 327 MB, `oom_kill` 0, `memory.peak` 837 MiB.
- 2026-11-24 — M3 amendment: face photos replaced by four WOCinTech Chat portraits (CC BY 2.0); photos 22517894562 and 22505425226 show the same person and share one face tag (`Unknown person 997921`, FaceNet distance 4.10 vs 13.95–17.76 for other pairs) — commit dec78a5c. Fixture regenerated incrementally (Iceland analysis unchanged): 14 photos, 31 tags (C11 O9 S5 L3 F3), 113 photo tags; test asserts the pair shares exactly one face tag and the four photos have 3. Playwright on the demo stack: searching the person's tag returns exactly those two photos. Found while checking: a persistent volume that still holds a removed demo photo gets it re-recorded by the hourly rescan — irrelevant to the demo (`emptyDir`), noted in §6.
- 2026-11-24 — M4: `pending_tasks_for`, shared `process_classification_task`, `get_classifier_spec`, `SingleProcessClassifier` + `classification_processor` command, `CLASSIFIER_EXIT_WHEN_IDLE` / `ModelManager.should_exit_when_idle()` in both run loops — commit 3244dbcb. Deviations: §4.4 step 2 now stays on the loaded model's type while it has pending enabled tasks before falling back to priority order (review finding: arriving colour tasks kept preempting the object model); `should_exit_when_idle()` also waits for unloads in progress (an unload pops the model while still holding its Redis lock, so exiting then left the lock held for up to its 300 s TTL and stalled the restarted process); the load cooldown is overridden through `ModelManager.set_load_cooldown()`.
  Measurement (deviation: style model, not object, to stay within the host's free RAM; `photonix-dev` image, `--memory=3g`, throwaway DB): one process fresh **86 MB**, style after its first predict **858 MB**, after `unload_model` **857 MB**; color after style 857 → 856 MB. RSS after unload is ~770 MB above fresh, consistent with M1 (c), so idle exit is kept.
  Done-when (deviation: isolated `dm515m4-*` stack instead of the shared dev stack, `ENV=prd`, object disabled on the library so its model never loads, `CLASSIFIER_IDLE_TIMEOUT=20`): `classification_processor` alone ran color → location → face → style → event with one model resident at a time, then logged `Exiting idle classifier process to release memory` and exited 0; under a one-program supervisord it logged `exited: classification_processor (exit status 0; expected)`, respawned, and the new process sat at 90 MB without exiting again. Tags: snow.jpg colour + style (serene); tree.jpg location (Greece, Firá); a face photo face (Unknown person); a copy dated 25 Dec event (Christmas Day); 32/32 tasks Completed.
  Deviation: `SingleProcessClassifier` sets its ModelManager's load cooldown to 0 — the cooldown staggers loads across several processes, and with one process it would put the batch after every type switch into memory-wait for 30 s. The memory check before loading still applies.

---

## 0. Open questions (ask before implementing)

- [x] **Decision needed:** Which four Flickr photos replace `face1.jpg`–`face4.jpg`? M3 proposes
      four candidates with their licences and detected-face counts and the founder approves
      them before the fixture is committed — **Default:** none; M3 stops at its approval box
      until the founder answers (M1 and M2 do not depend on it).

---

## 1. Goal & non-goals

**Goal:** the demo runs for 24 hours, with its 15-minute resets, under a 2 GiB memory limit
(request = limit) without an OOM kill and without a memory spike at reset; and any install can
set `LOW_MEMORY=1` to run classification in a single process that returns its memory when idle.

**Non-goals:**

- No change to which models are used or to inference code. The unmerged `ml-improvement` branch
  replaces TensorFlow with ONNX Runtime; this plan stays out of `photonix/classifiers/*/model.py`.
- No Docker image split, `photonix-ml` sidecar image, `run_ml.sh` or `supervisord-ml.conf`. Those
  stay on `ml-improvement`; only the process-list split is ported (§4.1).
- No semantic search or CLIP data in the demo fixture (those models do not exist on master).
- No consolidation of the non-classifier workers (raw, thumbnail, watch, rescan). See §7.
- No demo banner or other UI change.
- No automatic detection of small hosts; `LOW_MEMORY` is opt-in for v1.

---

## 2. Decisions (locked)

| Area | Decision |
|------|----------|
| **Reset owner** | The schedule stays in `epix-infra`: its CronJob runs the Photonix image with `python /srv/photonix/manage.py reset_demo` against the database. The SQL snapshot and its Secret are deleted. (Founder, 2026-11-24.) |
| **Reset interval** | Stays `*/15 * * * *`. |
| **Stored outputs** | A Django JSON fixture committed at `photonix/photos/demo/demo_library.json`, loaded by field name so added columns with defaults do not break it. A CI test loads it on every PR, so a breaking migration fails at review time. |
| **Photo set** | 14 photos, all downloaded from Flickr at pod start: the existing 10 in `import_demo_photos.py:17-28` plus four new face photos that reproduce what `face1`–`face4` show today (four photos, 1–2 faces each, 7 faces in total). (Founder, 2026-11-24; the four are approved in §0.) |
| **Persistent volume** | Removed from the demo. `/data` becomes an `emptyDir`; photos are re-downloaded and thumbnails regenerated on demand after each pod start. |
| **Demo process set** | `CLASSIFICATION_DISABLED=1` and `GUNICORN_WORKERS=2`. No classifier process runs, so no model can be loaded whatever tasks exist. |
| **When stored outputs are used** | `import_demo_photos` loads the fixture when `CLASSIFICATION_DISABLED=1`, and otherwise records photos for real analysis as it does today. The dev compose stack (`DEMO: 1`, classifiers on) keeps its current behaviour. |
| **Branch order** | Build on master. Port the process-list split from `ml-improvement` commit `9d81e9db` (`system/` files only) as M1, keeping its file names, env name and behaviour so that branch's later merge converges. (Founder, 2026-11-24.) |
| **Scope** | The general low-memory work is in this plan, not a follow-up. (Founder, 2026-11-24.) |
| **Low-memory mode** | `LOW_MEMORY=1` starts one `classification_processor` process (replacing the scheduler and six per-classifier processes), keeps at most one model loaded, and defaults gunicorn to 2 workers. Default layout is unchanged for existing installs. |
| **Memory release** | A classifier process that has unloaded its last idle model exits and lets supervisord restart it clean, in both the default and low-memory layouts, controlled by `CLASSIFIER_EXIT_WHEN_IDLE` (default on). M4 measures first: if RSS after unload is already within 50 MB of a fresh process, skip this and record the deviation. |
| **Rotation in the demo** | Rotating a photo still queues delayed face/object/style tasks (`photos/utils/tasks.py:72`). With no classifier process they stay unprocessed until the next reset deletes them. Accepted: tags from the fixture remain, and `CLASSIFICATION_DISABLED` must not suppress task creation because on `ml-improvement` it means "classifiers run in another container". |
| **`reset_demo` safety** | The command deletes every user, library and photo row. It refuses to run unless `demo_mode_enabled()` is true. It is never run against the shared dev database `photonix`. |
| **Memory limit** | 2Gi request = limit at rollout, as the ticket states. Lowered after the 24-hour check to about 1.5× the observed peak. |
| **Four face photos** | Four professional portraits from one stock collection, WOCinTech Chat (CC BY 2.0, credited in `photonix/photos/demo/README.md`), in which one person appears in two photos so the demo shows face grouping: 4 faces, 3 people. Replaces the first four picks (founder, 2026-11-24: "same face twice and detected as the same person", "a new photo collection on flickr that has more professional shots"). No pet photo in this set. |
| **Verification** | Each milestone is checked in Docker; user-visible behaviour gets a Playwright walkthrough. The founder checks the demo visually in Playwright before the M7 deploy. (Founder, 2026-11-24.) |
| **Dev database guard** | `reset_demo` refuses under `ENV=dev` unless `--allow-dev`, with text `reset_demo refused: ENV=dev. Pass --allow-dev to reset a development database.` Tightens the `reset_demo` safety row; added after M2 review found the dev stack satisfies `demo_mode_enabled()`. |
| **Startup reset failure** | At pod start a failed stored-outputs load is logged at ERROR and the pod starts anyway (no crash loop); the 15-minute `reset_demo` CronJob exits non-zero and is the visible signal. |
| **Process tooling** | The repo has no `.agent/project.yml`, so no test, lint or deploy command is configured. Commands in this plan come from `CLAUDE.md` and the `Makefile`. |

---

## 3. Current state (verified 2026-11-24)

Checked against master at `5036f547`, `epix-infra` main at `8017586`, and the live cluster
(read-only `kubectl`) on the date above.

### 3.1 Process topology and where memory goes

- Entry point `system/run.sh`: migrations, then `import_demo_photos` when `DEMO=1` or
  `SAMPLE_DATA=1` (`:31`), `reset_redis_locks` (`:37`), `housekeeping` once (`:40`), then
  `exec supervisord -c /etc/supervisord.conf` (`:44`).
- `system/supervisord.conf` defines 16 programs (`:16` nginx, `:25` app_server, `:36`
  retrain_face_similarity_index, `:47` vite, `:58` watch_photos, `:69` raw_scheduler, `:80`
  raw_processor, `:91` thumbnail_scheduler, `:102` classification_scheduler, `:113`–`:168` six
  `classification_*_processor` programs, `:179` rescan_photos_periodically). All but nginx and
  vite are long-running Django processes.
- `system/run_app_server.sh:8` hard-codes `gunicorn ... -w 8`.
- `system/run_vite_server.sh` exits immediately unless `ENV=dev`, and its program has
  `autorestart=true`, `startsecs=0`: supervisord respawned it about 7,000 times an hour on the
  demo (over a CPU core). `epix-infra` works around it by mounting an `exec sleep infinity`
  script over three run scripts (ConfigMap `photonix-demo-idle-dev-servers`).
- Classifier declared sizes (`approx_ram_mb`, used only for the pre-load check): object 2000
  (`classifiers/object/model.py:29`), face 600 (`face/model.py:50`), color 120, event 120, style
  100, location 100. Runtime is TensorFlow 2.21 (`requirements.txt:1`); there is no ONNX
  Runtime or CLIP on master.
- `ModelManager` (`photonix/classifiers/model_manager.py`) loads lazily on the first task,
  checks free memory first, and a watchdog unloads models idle for
  `CLASSIFIER_IDLE_TIMEOUT` seconds (default 300, `web/settings.py:222-226`) via
  `unload_model` (`:297-327`: pop, clear graph cache, `tf.keras.backend.clear_session()`,
  `gc.collect()`). The process itself keeps running with TensorFlow imported.
- Each classifier process polls the database every second while idle
  (`photos/utils/classification.py:212-251`).
- **Not measured:** per-process RSS. Only pod-level working set exists (next section). Whether
  RSS returns to baseline after `unload_model` is an inference, not a measurement; M1 and M4
  measure it.

### 3.2 What was observed on the cluster

From the `epix-infra` session that filed the ticket (VictoriaMetrics
`container_memory_working_set_bytes`; that series is duplicated there, so raw values read double):

- About 3.5 GB flat 10:17–10:25 UTC, 5.2 GB at 10:26, 5.4 GB at 10:27; OOMKilled (exit 137) at
  10:31:27; after restart 3.3 → 3.8 GB by 10:40. `restartCount` 2, both OOMKilled; node
  `SystemOOM` event; kubelet NotReady at 10:26 and 10:31–10:43.
- The 10:26 jump is off the `*/15` boundary and the pod was about 93 minutes old, so neither the
  reset nor pod start explains it. A jump of about 2 GB matches one object-model load; a visitor
  rotating a photo queues exactly that (`photos/schema.py:1497`, `:1686`). **Unproven.**
- Deployment `photonix/photonix-demo` is at 0/0 replicas (manual scale; Terraform still says 1,
  so an untargeted apply of `apps/photonix-demo` revives it with a 5Gi request / 6Gi limit).
- Latest reset job log (`photonix-demo-reset-29925315`): 187 rows inserted, 126 errors, all
  `null value in column "priority" of relation "photos_task"`, then "Demo database reset
  complete!". `psql` runs without `ON_ERROR_STOP`.

### 3.3 The reset job and snapshot (`epix-infra/apps/photonix-demo/`)

- `main.tf`, resource `kubernetes_cron_job_v1.reset_demo`: image `postgres:16-alpine`,
  `TRUNCATE` of 15 tables with `CASCADE`, then `psql -f` of `db_snapshot.sql.gz.b64` (Secret
  `photonix-demo-db-snapshot`), connecting to `var.reset_db_host` (the primary, not the pooler).
- The dump is `pg_dump` 11.1 output with positional `INSERT`s, taken 2026-01-26: 1 user, 1
  library, 14 photos, 14 photo files, 34 tags, 116 photo tags, 126 tasks, 3 refresh tokens.
- Tag types present: 16 color, 10 face, 5 style, 3 location; **no object and no event tags**.
  Tasks: 14 `classify.object` pending, 14 `classify_images` started, the rest complete.
- Faces: `face1.jpg`–`face4.jpg` carry 7 face tags (2, 2, 1, 2), all named `Unknown person N`.
  Those four files exist only on the PVC; the other ten are the Flickr URLs in the repo.
- Deployment env: `ENV=prd`, `DEMO=1`, `CLASSIFIER_MEMORY_BUFFER_MB=200`, `REDIS_HOST`,
  `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, Postgres settings. Image pinned by digest
  (`local.image`). `security_context.fs_group = 2000`. Four `subPath` mounts of PVC
  `photonix-demo-data` (10Gi `hcloud-volumes`, defined in `apps/main.tf` as
  `kubernetes_persistent_volume_claim_v1.photonix_demo_data`, passed as `var.pvc_name`).

### 3.4 Every path that can queue analysis

All task creation goes through these; the plan relies on none of them being able to load a model
once no classifier process runs.

| Path | Where | After a reset today |
|---|---|---|
| `record_photo` → `ensure_raw_processed` → `generate_thumbnails` → `classify_images` → `classify.*` | `photos/utils/db.py:227-232`, `utils/raw.py:46-86`, `utils/thumbnails.py:46-50`, `utils/classification.py:33-60` | Skipped only if a `PhotoFile` exists with the same path and `file_modified_at` equal to the file's mtime (`db.py:60-67`) |
| Hourly rescan | `rescan_photos_periodically.py:29-33` → `record_photo` per file | No-op only while the mtime check above holds |
| Startup housekeeping | `housekeeping.py:35-41`: `generate_thumbnails` for photos with `thumbnailed_version < 20260127` | Runs on every pod start; with no `classify_images` row it chains into every classifier |
| Rotation / preferred file | `photos/schema.py:1494-1497`, `:1686` → `queue_reclassification_for_photo` (`utils/tasks.py:72`): delayed face/object/style tasks | Not blocked for the demo user (`demo_user_locked` gates only library and account mutations, `schema.py:1015-1262`) |
| Stuck-task requeue | `utils/tasks.py:8-16`: `S`/`F` back to `P` after 24 h | Irrelevant within a 15-minute reset |

Scheduling is driven purely by task rows; nothing scans for photos lacking tags, and
`PhotoTag.model_version` is not consulted.

### 3.5 Where analysis results live

- `Tag` (`photos/models.py:328-344`) and `PhotoTag` (`:346-363`), including box position/size
  and, for faces, `extra_data` holding the 128-float embedding.
- `Photo.thumbnailed_version` (`:196`), `PhotoFile.file_modified_at` (`:279`),
  `PhotoFile.thumbnailed_version` (`:281`).
- Thumbnails at `/data/cache/thumbnails/photofile/{w}x{h}_{crop}_q{q}/{photofile_id}.jpg`, keyed
  by `PhotoFile` UUID, generated on demand when missing (`utils/thumbnails.py:64-98`) and stored
  **without** rotation applied (`:91-94`), so a database reset never invalidates them.
- Face similarity index files under `/data/models/face/`, rebuilt by
  `retrain_face_similarity_index`; used only when classifying new faces.
- Redis holds only locks and two classifier cooldown keys; nothing references database rows.

### 3.6 Conventions to reuse

- Demo gating: `demo_mode_enabled()` in `photonix/web/utils.py:14` (false when `ENV=test`, so
  tests monkeypatch it).
- Management-command and task-pipeline tests: `tests/test_task_queue.py` (fixtures built with
  `record_photo` on `tests/photos/snow.jpg`; loops driven by monkeypatching `sleep`, e.g. `:168`).
  Model lifecycle tests: `tests/test_model_manager.py`. Factories: `tests/factories.py`.
- Process split to port: `git show 9d81e9db -- system/` on `ml-improvement` (`system/conf/
  programs-core.conf`, `system/conf/programs-classification.conf`, `system/supervisord.conf`,
  `system/supervisord-core.conf`, and the `CLASSIFICATION_DISABLED` branch in `system/run.sh`).
- Tests: `make test` (`Makefile:35`); one module:
  `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py <module>`.
- CI (`.github/workflows/docker-build.yml`) runs on every push to master with no path filter and
  pushes `photonixapp/photonix:edge`; the demo is deployed by bumping a digest in `epix-infra`.

### 3.7 Duplication to remove

- The per-classifier `library__classification_<name>_enabled` filter is an if/elif chain in
  `photos/utils/classification.py:227-238`.
- Six near-identical `classification_*_processor` commands differ only in model class, name,
  runner and worker count.
- The demo's photo list, user, library and data exist both as code (`import_demo_photos.py`) and
  as an SQL dump in another repo.

---

## 4. Design

### 4.1 Process layouts (M1)

Port from `9d81e9db`, `system/` only:

- `system/conf/programs-core.conf`: nginx, app_server, vite, watch_photos, raw_scheduler,
  raw_processor, thumbnail_scheduler, rescan_photos_periodically.
- `system/conf/programs-classification.conf`: classification_scheduler, the six
  `classification_*_processor` programs, retrain_face_similarity_index.
- `system/supervisord.conf`: header plus `[include] files = /srv/system/conf/programs-core.conf
  /srv/system/conf/programs-classification.conf` (absolute paths; `system/` is at `/srv/system`
  in both the prd image and the dev bind mount).
- `system/supervisord-core.conf`: header plus the core include only.
- `system/run.sh`: when `CLASSIFICATION_DISABLED=1`, skip `reset_redis_locks` and
  `exec supervisord -c /srv/system/supervisord-core.conf`; otherwise as today. Keep
  `housekeeping` as the one-shot call it is on master (the periodic loop is `ml-improvement`'s).

Not ported: `docker/Dockerfile.ml`, `system/run_ml.sh`, `system/supervisord-ml.conf`, the compose
example, CLIP programs.

Added on top:

- `system/run_app_server.sh`: `-w "${GUNICORN_WORKERS:-8}"`. `run.sh` exports
  `GUNICORN_WORKERS=2` when `LOW_MEMORY=1` and the variable is unset.
- `system/run_vite_server.sh`: when `ENV` is not `dev`, `exec sleep infinity` so supervisord
  stops respawning it.
- `system/memory_report.sh`: prints one line per process (`RSS MB`, `PSS MB` from
  `/proc/<pid>/smaps_rollup` when readable, command) sorted by RSS, then the cgroup total from
  `/sys/fs/cgroup/memory.current`. Used for the measurements in M1, M4 and M5 and by operators.

Layout selection in `run.sh`, in this order:

| Env | supervisord config | Classifier processes |
|---|---|---|
| `CLASSIFICATION_DISABLED=1` | `/srv/system/supervisord-core.conf` | none |
| `LOW_MEMORY=1` | `/srv/system/supervisord-lowmem.conf` (M5) | one |
| neither | `/etc/supervisord.conf` | seven (unchanged) |

### 4.2 Demo module (M2)

New `photonix/photos/utils/demo.py`:

```python
FIXTURE_PATH = Path(__file__).resolve().parent.parent / 'demo' / 'demo_library.json'
DEMO_LIBRARY_NAME = 'Demo Library'
DEMO_PHOTO_URLS = [...]          # moved from import_demo_photos.py; 14 entries after M3
RESET_ADVISORY_LOCK_ID = 515515

def download_demo_photos() -> list[str]:
    """Download each URL missing from disk. A failed download is logged and skipped.
    Then set each file's mtime (os.utime) to the file_modified_at its PhotoFile has in the
    fixture, when the fixture has that path. Returns the paths present on disk."""

def export_demo_fixture(path=FIXTURE_PATH) -> dict[str, int]:
    """Serialize the Demo Library to Django JSON: the demo User, Library, LibraryPath,
    LibraryUser, and the Camera, Lens, Photo, PhotoFile, Tag and PhotoTag rows of photos whose
    file basename is in DEMO_PHOTO_URLS. No Task, token or invitation rows. Raises
    CommandError if any of those photos has a task that is not Completed. Returns row counts."""

def reset_demo() -> dict[str, int]:
    """In one transaction: take pg_advisory_xact_lock(RESET_ADVISORY_LOCK_ID) on PostgreSQL,
    delete every row of every model in the `photos` app, every RefreshToken, admin LogEntry
    and User, load FIXTURE_PATH, set Photo.thumbnailed_version and PhotoFile.thumbnailed_version
    to THUMBNAILER_VERSION, and create one Completed `classify_images` Task per photo.
    Returns row counts."""
```

Rules that matter:

- Delete by iterating `apps.get_app_config('photos').get_models()` so models added later
  (for example `PhotoEmbedding` on `ml-improvement`) are covered without editing this code.
- Load with Django's deserializer (`loaddata`), which saves raw and so keeps the fixture's
  `created_at`/`updated_at` instead of `VersionedModel.save()` overwriting them.
- The Completed `classify_images` row is the guard at `utils/thumbnails.py:46-50`; create it in
  code rather than storing tasks in the fixture.
- The mtime pin is what keeps the hourly rescan a no-op (`utils/db.py:60-67`): `reset_demo` runs
  in a pod that cannot see the files, so the files are made to match the fixture, not the
  reverse.
- When `ENV=dev`, set the demo `LibraryUser.owner` to true after loading, as
  `import_demo_photos.py:76-81` does today.

Commands in `photonix/photos/management/commands/`:

- `reset_demo`: calls `reset_demo()`; prints the counts. Refusal text, a stable match token for
  the test and the infra job log:
  `reset_demo refused: DEMO is not enabled on this instance. This command deletes every user, library and photo record.`
  (raised as `CommandError`, exit code 1).
- `export_demo_fixture`: calls `export_demo_fixture()`; prints the counts and the path.
- `import_demo_photos` (existing): always `download_demo_photos()` first. Then, when
  `CLASSIFICATION_DISABLED=1`, call `reset_demo()`; otherwise keep today's behaviour (create
  user, library and path if missing, `record_photo` for newly downloaded files).

### 4.3 The fixture and the four face photos (M3)

- Candidate face photos: Flickr, original-size download URLs in the same
  `https://live.staticflickr.com/.../..._o_d.jpg` form as the existing ten; licence must allow
  redistribution without attribution duties in the UI (public domain or CC0), or be the
  founder's own. Together they give four photos with 1–2 clearly visible adult faces each, about
  7 faces in total, as today.
- The fixture is generated once, on an isolated stack built from this branch with classifiers
  enabled (own containers, database and data directory; never the shared dev stack), by letting
  all 14 photos finish analysis and running `export_demo_fixture`.
- Expected content: 1 user, 1 library, 1 path, 1 library user, 14 photos, 14 photo files, and
  tags of every type the six classifiers produce, including object and event tags where the
  classifier finds any.
- `photonix/photos/demo/README.md` records how the fixture was produced, the model versions, and
  each photo's source page and licence.

### 4.4 Single classifier process and memory release (M4)

In `photonix/photos/utils/classification.py`:

```python
def pending_tasks_for(task_type):
    """Pending tasks of this type whose library has the classifier enabled. Classifiers
    without a Library toggle are always enabled. Replaces the if/elif chain."""

def get_classifier_spec(name):
    """Lazy import of photonix.classifiers.<name>; returns (model_class, run_on_photo)."""

class SingleProcessClassifier:
    def __init__(self, classifiers=CLASSIFIERS, batch_size=8): ...
    def run(self, loop=True): ...
```

`SingleProcessClassifier.run`, each pass:

1. `process_classify_images_tasks()` (the scheduler's job), then the three requeue helpers for
   each classifier type.
2. If a model is loaded and its type still has pending enabled tasks, take the next of those,
   so newly queued higher-priority tasks (e.g. `classify.color` during an import) don't force a
   2–3 GB object model to unload and reload repeatedly. Otherwise take the first pending task
   across all enabled types in the model's own ordering (`-priority, created_at`,
   `photos/models.py:398`). No task: go to step 5.
3. If a different model is loaded, `unload_model` it first, so at most one model is resident.
4. Process up to `batch_size` pending tasks of that type on the main thread with the same
   claim / touch / complete / `memory_wait` / failed handling as
   `ThreadedQueueProcessor.__process_task` (extract that method's body into a shared function
   rather than copying it).
5. Call the idle-exit check, sleep 1 s.

New command `classification_processor` starts the watchdog and runs it.

Idle exit, shared by both processors:

- `web/settings.py`: `CLASSIFIER_EXIT_WHEN_IDLE = os.environ.get('CLASSIFIER_EXIT_WHEN_IDLE', '1') != '0'`.
- `ModelManager.should_exit_when_idle() -> bool`: true when the setting is on, this process has
  loaded at least one model since start, and none is loaded now.
- Both run loops check it only between batches, on the main thread, with no task in flight, then
  log `Exiting idle classifier process to release memory` and `sys.exit(0)`. supervisord
  restarts the program (`autorestart=true` already applies to exit code 0). Never exit from the
  watchdog thread.

### 4.5 Low-memory layout and documentation (M5)

- `system/conf/programs-classification-lowmem.conf`: one program
  `classification_processor` (same niceness and log settings as the existing classifier
  programs) plus `retrain_face_similarity_index`.
- `system/supervisord-lowmem.conf`: header plus core and low-memory includes.
- `README.md`, new section "Memory requirements": the measured table (layout × idle /
  peak while analysing / idle after analysis), the recommended minimum RAM for each layout, and
  an environment table for `LOW_MEMORY`, `CLASSIFICATION_DISABLED`, `GUNICORN_WORKERS`,
  `CLASSIFIER_EXIT_WHEN_IDLE`, `CLASSIFIER_IDLE_TIMEOUT` and `CLASSIFIER_MEMORY_BUFFER_MB`.
  State the trade-off in one sentence: low-memory mode analyses one photo at a time.

### 4.6 `epix-infra` changes (M6)

All in `apps/photonix-demo/main.tf` unless noted:

- Deployment env: add `CLASSIFICATION_DISABLED=1`, `GUNICORN_WORKERS=2` and `THUMBNAIL_WORKERS=1`; remove
  `CLASSIFIER_MEMORY_BUFFER_MB`.
- Resources: memory request and limit both `2Gi`.
- Volume `data`: `empty_dir { size_limit = "5Gi" }` instead of the PVC; the four `subPath`
  mounts stay. Remove `var.pvc_name` and, as the last rollout step,
  `kubernetes_persistent_volume_claim_v1.photonix_demo_data` in `apps/main.tf`.
- Remove ConfigMap `photonix-demo-idle-dev-servers` and its three mounts (the image no longer
  needs them after §4.1).
- CronJob: container image `local.image`, command
  `["python", "/srv/photonix/manage.py", "reset_demo"]`, env `ENV=prd`, `DEMO=1`, `REDIS_HOST`
  and the same Postgres settings as today (`var.reset_db_host` kept), an `emptyDir` at
  `/data/cache` for the secret-key file, `fs_group = 2000`, memory request 256Mi / limit 512Mi.
  Delete `kubernetes_secret_v1.db_snapshot` and `db_snapshot.sql.gz.b64`.
- `local.image`: the digest of the build that contains this plan's merge.

---

## 5. Milestones

**Process:** build with `plan-implement`, test by effect with `qa-verify`, review with
`pr-review`, open the PR with `pr-open`, release with none configured — see the rollout
milestone. Those skills carry the steps; this plan holds only what is specific to this work.
**Branch:** `fix/demo-memory`.

**Process notes:**

- `ml-improvement` will conflict with M1, M4 and M5 in `system/` and
  `photos/utils/classification.py` when it merges. Keep its file names and env names exactly as
  in §4.1 so the conflict is mechanical; its CLIP processor then needs adding to
  `get_classifier_spec` and the low-memory layout.
- The demo's return (M6, M7) depends only on M1–M3. If the founder wants it back before the
  low-memory work is done, say so and M6/M7 can run from a PR cut after M3.
- `reset_demo` deletes all users and libraries in whatever database it is pointed at. Every
  manual run in this plan uses a throwaway database, never the shared dev database `photonix`.
- M6 is a branch and PR in `~/projects/epix-infra` following that repo's own `CLAUDE.md`
  (targeted `terraform plan` only; never `apply`).

### M0 — Stop an accidental revival (founder / `epix-infra` session)

- [ ] `apps/photonix-demo/main.tf` on `epix-infra` main has `replicas = 0` on the demo
      Deployment and the reset CronJob has `suspend = true`, applied with a targeted apply, so
      an unrelated apply cannot bring the 6 GiB pod back before M7 and the failing reset stops
      running against an idle database (§3.2).

**Verify:** `kubectl -n photonix get deploy/photonix-demo cronjob/photonix-demo-reset` shows 0
replicas and `SUSPEND True`; a `terraform plan` targeted at the module shows no changes.
**Done when:** Terraform state and the cluster agree that the demo is off.

### M1 — Process layouts, gunicorn worker setting, baseline measurement

- [x] The supervisord program list is split into `system/conf/programs-core.conf` and
      `system/conf/programs-classification.conf` with `system/supervisord.conf` including both
      and a new `system/supervisord-core.conf` including core only (§4.1; port from
      `git show 9d81e9db -- system/`, dropping the CLIP programs and anything about the ML
      sidecar). Every program in today's `system/supervisord.conf:16-179` appears exactly once
      across the two files with its command unchanged.
- [x] `system/run.sh` starts the core-only config and skips `reset_redis_locks` when
      `CLASSIFICATION_DISABLED=1`, and behaves as today otherwise (§4.1; today's tail is
      `run.sh:36-44`).
- [x] gunicorn's worker count comes from `GUNICORN_WORKERS`, default 8
      (`system/run_app_server.sh:8`).
- [x] The Vite program idles instead of exiting when `ENV` is not `dev`
      (`system/run_vite_server.sh`), ending the respawn loop described in §3.1.
- [x] `system/memory_report.sh` exists and is executable (§4.1).
- [x] Tests in a new `tests/test_process_layouts.py`: parse the config files and assert the
      default layout's program set equals the 16 names listed in §3.1, the core layout contains
      no program whose command mentions `classification` or `retrain_face`, and every include
      path exists. Plain file parsing with `configparser`; no Django needed.
- [x] Baseline recorded in this plan's Progress log: build `docker/Dockerfile.prd` locally, run
      it with `DEMO=1` against a throwaway Postgres and Redis, and paste the
      `memory_report.sh` output for (a) default layout idle before any analysis, (b) default
      layout while the demo photos are being analysed, (c) default layout 10 minutes after
      analysis finishes, (d) `CLASSIFICATION_DISABLED=1 GUNICORN_WORKERS=2` idle. These are the
      numbers §3.1 says are missing.

**Verify:** `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py test_process_layouts`.
In the locally built prd image with `CLASSIFICATION_DISABLED=1`, `supervisorctl status` lists no
classification program and the `vite` program stays `RUNNING` with one start.
**Done when:** the four measurements are in the Progress log, and case (d) totals under 1.5 GiB.

### M2 — `reset_demo`, `export_demo_fixture`, and stored outputs at startup

**Model:** session — the reset deletes every user and library row; the guard and transaction
behaviour must be exactly right.

- [x] `photonix/photos/utils/demo.py` provides `download_demo_photos`, `export_demo_fixture`
      and `reset_demo` with the contracts in §4.2. The URL list moves here from
      `import_demo_photos.py:17-28` (still 10 entries in this milestone).
- [x] `reset_demo` management command refuses with the exact text in §4.2 unless
      `demo_mode_enabled()` (`photonix/web/utils.py:14`), exits non-zero on any error so the
      infra Job fails visibly, and prints row counts on success.
- [x] `export_demo_fixture` management command writes the fixture and refuses while any demo
      photo has an unfinished task (§4.2).
- [x] `import_demo_photos` downloads first, then loads stored outputs when
      `CLASSIFICATION_DISABLED=1` and keeps today's record-and-analyse behaviour otherwise
      (§4.2; current body `import_demo_photos.py:34-92`). The dev stack, which sets `DEMO: 1`
      without `CLASSIFICATION_DISABLED`, must behave as before.
- [x] A small test fixture at `tests/fixtures/demo_library.json` (2 photos using
      `tests/photos/snow.jpg` paths, a few tags of different types, one face tag with
      `extra_data`) so tests do not depend on the real fixture, which arrives in M3.
- [x] Tests in a new `tests/test_demo_reset.py`, following `tests/test_task_queue.py` and
      monkeypatching `demo_mode_enabled` and `FIXTURE_PATH`: refusal when demo mode is off
      leaves all rows untouched; a reset removes a user, library, tag, pending task and
      invitation created beforehand and restores exactly the fixture's rows; fixture timestamps
      survive the load; one Completed `classify_images` task exists per photo and no other
      tasks; running `generate_thumbnails_for_photo` on a restored photo creates no
      `classify_images` or `classify.*` task (`utils/thumbnails.py:46-50`); after
      `download_demo_photos` pins mtimes, `record_photo` on the file returns `'SKIPPED'`
      (`utils/db.py:60-67`); two resets in a row give identical row counts; export then reset
      round-trips a library built with `record_photo`; after a reset, `housekeeping` queues no
      `generate_thumbnails` task (M1 measured `thumbnail_processor` alone at ~1.6 GB RSS, so the
      demo must not bulk-regenerate thumbnails at pod start; they are made on demand per request).

**Verify:** `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py test_demo_reset test_task_queue`.
**Done when:** those tests pass, and `manage.py reset_demo` run without `DEMO=1` prints the
refusal text and exits 1.

### M3 — Four Flickr face photos and the real fixture

- [x] Four candidate Flickr photos chosen to the criteria in §4.3, each with its page URL,
      original download URL, licence, and the number of faces the face classifier detects when
      run on it in an isolated stack built from this branch.
- [x] **Founder approval (§0):** satisfied by the §2 "Four face photos" row (founder delegated the choice to the
      implementer, 2026-11-24); no separate approval round.
- [x] `DEMO_PHOTO_URLS` has 14 entries (`photonix/photos/utils/demo.py`).
- [x] `photonix/photos/demo/demo_library.json` is generated as §4.3 describes and committed, with
      `photonix/photos/demo/README.md` recording sources, licences and model versions.
- [x] Tests added to `tests/test_demo_reset.py` against the real fixture: it loads cleanly
      (this is the migration-drift guard); it has 14 photos and 14 photo files whose basenames
      match `DEMO_PHOTO_URLS`; it has at least one tag of each of the types color, location,
      style, object and face; the face photos carry at least 6 face tags with embeddings; it
      contains no model outside the list in §4.2.

**Verify:** `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py test_demo_reset`.
Walkthrough on the locally built prd image started with `DEMO=1 CLASSIFICATION_DISABLED=1
GUNICORN_WORKERS=2` and an empty data directory, on a throwaway database: log in as `demo` /
`demo`; the timeline shows 14 photos with thumbnails; a photo's detail view lists colour,
object, location and style tags; a face photo shows face boxes; the filter panel offers object
and colour facets. Rotate one photo, add a tag to another, then run `manage.py reset_demo` and
reload: rotation and tag are gone, all 14 thumbnails still load, and `memory_report.sh` shows no
classifier process before or after.
**Done when:** the walkthrough holds and the container's cgroup total stays under 1.5 GiB
through the reset.

### M3a — Bounded thumbnail memory

Added 2026-11-24 after the M3 walkthrough: on the demo stack (`CLASSIFICATION_DISABLED=1`,
`GUNICORN_WORKERS=2`, `--memory=2g`, empty thumbnail cache) loading the timeline OOM-killed
gunicorn workers three times (`memory.events` `oom_kill 3`, `memory.peak` = 2 GiB). The 256×256
timeline size is `force_accurate` (`web/settings.py:198`), so `srgbResize`
(`photos/utils/thumbnails.py`) turns the full-resolution image (20 MP for most demo photos) into
float arrays — on the order of 1 GB per request — and `get_thumbnail` calls `im.convert('RGB')`
before any `draft`, so JPEG reduced-scale decoding never applies. This is the same cost M1 saw in
`thumbnail_processor` (~1.6 GB), and with the demo's `emptyDir` it recurs after every pod start.

- [x] `get_thumbnail` asks the JPEG decoder for a reduced-scale decode before anything loads the
      pixels: `im.draft('RGB', (width * 2, height * 2))` straight after `Image.open` (the same
      2× reducing gap Pillow's `thumbnail()` uses; a no-op for non-JPEG and for sizes near the
      original). Output size, crop and orientation behaviour are unchanged. `THUMBNAILER_VERSION`
      is **not** bumped: a bump makes `housekeeping` regenerate every thumbnail on every install.
- [x] Tests in `tests/test_thumbnails.py` (existing file; follow its pattern): a large generated
      JPEG produces a 256×256 cover thumbnail and 1920 contain thumbnail of the right sizes, and
      the draft is applied (e.g. assert on `Image.Image.draft` being called with the 2× size, or
      that the decoded image passed to the resize is smaller than the original).
- [x] Measurement in the Progress log: peak RSS of one process generating the 256 accurate
      thumbnail for a demo photo before and after (e.g. `resource.getrusage` in a
      `manage.py shell` run), and the demo stack walkthrough repeated with an empty thumbnail
      cache under `--memory=2g` with `oom_kill 0`.

**Verify:** `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py test_thumbnails`.
**Done when:** a cold timeline load on the demo stack at a 2 GiB limit shows all 14 thumbnails
with `oom_kill` 0 and `memory.peak` under 1.5 GiB.

### M4 — Single classifier process and memory release

**Model:** session — process lifecycle and task claiming under concurrency.

- [x] Measurement first, recorded in the Progress log: RSS of the object classifier process
      fresh, with the model loaded, and after the watchdog unloads it. If the last is within
      50 MB of the first, skip the idle-exit boxes below and note the deviation (§2).
- [x] `pending_tasks_for(task_type)` replaces the if/elif chain at
      `photos/utils/classification.py:227-238` and is used by both processors (§4.4).
- [x] The task-handling body of `ThreadedQueueProcessor.__process_task`
      (`classification.py:116-151`) is a shared function used by both processors, behaviour
      unchanged.
- [x] `get_classifier_spec` and `SingleProcessClassifier` exist as in §4.4, and a new
      `classification_processor` command runs it with the watchdog started, following
      `classification_color_processor.py`. Confirm each of the six classifier packages exports
      a model class and `run_on_photo` before relying on it.
- [x] `CLASSIFIER_EXIT_WHEN_IDLE` setting and `ModelManager.should_exit_when_idle()` (§4.4);
      both run loops exit only between batches on the main thread.
- [x] Tests, following `tests/test_task_queue.py` and `tests/test_model_manager.py` with models
      and runners faked: the single processor expands a pending `classify_images` task and
      completes its children in priority order; a disabled classifier's tasks are not picked
      up; switching task type unloads the previous model, so no two models are ever loaded
      together; an `InsufficientMemoryError` puts the task into memory-wait; a second processor
      cannot claim a task the first claimed; `should_exit_when_idle` is false before any load,
      false while loaded, true after unload, and always false with the setting off; the run
      loop raises `SystemExit(0)` only when it is true.

**Verify:** `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py test_task_queue test_model_manager test_classifier_runners`.
**Done when:** those pass, and in the dev stack running `manage.py classification_processor`
alone (the seven classifier programs stopped with `supervisorctl`) a newly imported photo ends
up with tags from every enabled classifier and the process exits and restarts once idle.

### M5 — Low-memory layout, measurements, documentation

- [ ] `system/conf/programs-classification-lowmem.conf` and `system/supervisord-lowmem.conf`
      exist as in §4.5, and `system/run.sh` selects layouts in the order of the §4.1 table and
      exports `GUNICORN_WORKERS=2` under `LOW_MEMORY=1` when it is unset.
- [ ] `thumbnail_processor` and `raw_processor` take their worker count from `THUMBNAIL_WORKERS`
      / `RAW_WORKERS` when set (defaults unchanged: `cpu_count()/2` and `/4`,
      `thumbnail_processor.py:44`, `raw_processor.py:44`); `run.sh` exports both as 1 under
      `LOW_MEMORY=1` when unset. Added to the README environment table. (M1 measured the
      thumbnail processor at ~1.6 GB RSS with four workers.)
- [ ] `tests/test_process_layouts.py` covers the low-memory layout: exactly one program whose
      command mentions `classification`, plus the face-retrain loop and every core program.
- [ ] Measurements in the Progress log from the locally built prd image with `LOW_MEMORY=1`:
      idle, peak while analysing the 14 demo photos, and idle 10 minutes after; and the default
      layout's idle-after-analysis figure again now that idle exit exists, next to M1's (c).
- [ ] `README.md` "Memory requirements" section with the measured table, minimum RAM per layout
      and the environment table (§4.5). Use the measured numbers, rounded up; no estimates.

**Verify:** `docker compose -f docker/docker-compose.dev.yml run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py test_process_layouts`.
Walkthrough on the prd image with `LOW_MEMORY=1` and `--memory=2g`, classifiers enabled, throwaway
database: the 14 demo photos finish analysis, `supervisorctl status` shows one classification
program, and `docker inspect` reports `OOMKilled: false`.
**Done when:** low-memory idle-after-analysis is within 100 MB of low-memory idle before
analysis, and the README table is filled from the Progress log figures.

### M6 — `epix-infra` module changes (PR only, not applied)

- [ ] A branch and PR in `~/projects/epix-infra` making the changes in §4.6 except the PVC
      removal and the digest bump, which belong to M7. Keep `replicas = 0` and
      `suspend = true` from M0 in this PR; M7 flips them.
- [ ] The reset CronJob fails when the command fails: no shell wrapper that can swallow the
      exit code, `backoff_limit = 1` kept.
- [ ] `terraform fmt -check -recursive && terraform validate` pass, and a plan targeted at
      `module.apps.module.photonix_demo[0]` is attached to the PR showing only the intended
      resources.

**Verify:** the attached plan output: Deployment, CronJob updated in place; ConfigMap
`photonix-demo-idle-dev-servers` and Secret `photonix-demo-db-snapshot` destroyed; nothing
outside the module.
**Done when:** the PR is open with a clean targeted plan and nothing has been applied.

### M7 — Production rollout

**Released by:** founder

The Photonix side releases itself: merging `fix/demo-memory` to master builds and pushes
`photonixapp/photonix:edge`. No release skill is configured, so the steps are listed.

- [ ] Pre-flight: the `build-and-push` job for the merge commit finished; the new digest is read
      with `docker buildx imagetools inspect photonixapp/photonix:edge`; `git status` in
      `epix-infra` is clean of other sessions' changes to the module.
- [ ] Pre-flight, optional: copy `face1.jpg`–`face4.jpg` off PVC `photonix-demo-data` with a
      one-off pod if the founder wants to keep them; they are destroyed with the volume.
- [ ] `local.image` set to the new digest, `replicas = 1`, CronJob `suspend = false`; targeted
      plan reviewed; the founder applies it.
- [ ] First hour: pod Ready with 0 restarts; `kubectl -n photonix exec deploy/photonix-demo -- /srv/system/memory_report.sh`
      shows no classifier process and a total under 1.5 GiB; the first reset Job completes and
      its log shows `reset_demo` row counts and no error; working set does not step up at the
      reset (VictoriaMetrics `container_memory_working_set_bytes`, halving the duplicated
      series); log in at https://demo.photonix.org as `demo` / `demo` and see 14 photos with
      object and face tags.
- [ ] After 24 hours with no OOM kill and no restart: lower request and limit to about 1.5× the
      observed peak; remove `kubernetes_persistent_volume_claim_v1.photonix_demo_data` and
      `var.pvc_name`; the founder applies.
- [ ] Close out per `ticket-update` and `plan-implement` §3: #515 closed with the measured
      figures, card to Released, plan archived, `epix-infra` PR merged, and a follow-up ticket
      filed for §7's first item if the measurements justify it.

**Back out:** set `replicas = 0` and `suspend = true` again (the M0 state) with a targeted
apply; nothing persistent is at risk because the demo has no volume after this change and its
database is rewritten every 15 minutes. Until the PVC is removed in the 24-hour step, reverting
the `epix-infra` PR restores the previous deployment exactly. The Photonix changes are reverted
with a normal revert commit; `CLASSIFIER_EXIT_WHEN_IDLE=0` turns idle exit off without a
release.

**Verify:** the first-hour checks above, then the 24-hour working-set graph.
**Done when:** the demo has run 24 hours with resets under a 2 GiB limit, `restartCount` is 0,
and the working-set series shows no step at any reset.

---

## 6. Risks & edge cases

| Risk | Mitigation |
|---|---|
| `reset_demo` run against a real database deletes everything | Refuses unless demo mode is on; plan forbids the shared dev database; tested that refusal changes nothing. |
| Flickr is unreachable or throttles at pod start | A failed download is skipped, the pod still starts, and that photo shows a broken thumbnail until the next pod start. Accepted for v1; §7 has the alternative. |
| Startup housekeeping deletes `PhotoFile` rows for files that failed to download (`cleanup_orphaned_photofiles`, `photos/utils/db.py:297`) | The next reset restores them; within 15 minutes. Accepted. |
| A migration makes the fixture unloadable | The M3 test loads the real fixture in CI on every PR. |
| Reset runs while the app pod is starting or another reset is in flight | One transaction plus a PostgreSQL advisory transaction lock; readers see either the old or the new state. |
| A request holds a JWT for a user row that was deleted and recreated | The fixture keeps the demo user's primary key, so tokens stay valid across resets; refresh tokens are wiped and the login form pre-fills demo credentials. |
| Secret key regenerates on every pod start without a volume | Sessions end on pod restart. Accepted for a demo. |
| The reset Job lands on a node without the multi-GB image | `IfNotPresent` pull, minutes at worst, then cached; `concurrency_policy = Forbid` prevents overlap. If pulls prove frequent, add pod affinity to the demo pod. |
| Idle exit restarts a classifier process in a loop | It exits only after a model was loaded and then unloaded, so an idle process that never loaded anything never exits; env switch to disable. |
| Low-memory mode is slower | Documented; it is opt-in. |
| Single processor thrashes between large models | It stays on the loaded type until that type has no pending tasks, then picks by priority (§4.4 step 2), so a model is reloaded at most once per drained queue; other types wait while the loaded type drains. The pre-load memory check still applies. |
| A data volume keeps a photo that has since left `DEMO_PHOTO_URLS` | The hourly rescan records it as an extra photo until the next reset removes its rows (then it is re-recorded). Cannot happen on the demo (`emptyDir`, fresh each pod); accepted for dev volumes. |
| Rotation leaves delayed tasks nobody processes in the demo | Deleted by the next reset (§2). |
| `ml-improvement` merge conflicts | File and env names match that branch (§5 process notes). |
| The root cause of the 10:26 spike is unproven | With no classifier process in the demo no model can load at all, which removes the whole class rather than one trigger; M7's 24-hour check is the proof. |

---

## 7. Out of scope / future ideas

- Fold the non-classifier workers (raw scheduler and processor, thumbnail processor, watcher,
  rescan loop) into fewer processes. M1's baseline shows what each costs; file a ticket if they
  dominate the demo's idle figure.
- Turn low-memory mode on automatically when the cgroup limit or host RAM is small.
- Host the demo photos somewhere we control instead of Flickr.
- Block rotation-triggered re-analysis for the locked demo user.
- A demo banner showing time until the next reset.
- After `ml-improvement` merges: add CLIP embeddings to the fixture and the CLIP processor to
  the single-process classifier.
