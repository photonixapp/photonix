# Demo library fixture

`demo_library.json` holds the stored analysis results for the public demo
(demo.photonix.org). The demo runs without classifier processes; `reset_demo`
(and `import_demo_photos` under `CLASSIFICATION_DISABLED=1`) loads this file
instead of analysing the photos. The photos themselves are not in the
repository: `photonix/photos/utils/demo.py` (`DEMO_PHOTO_URLS`) downloads them
from Flickr at start-up.

Every photo's file name in the fixture must match a URL in `DEMO_PHOTO_URLS`;
`tests/test_demo_reset.py` checks this and that the fixture loads against the
current schema.

## How it was produced

Generated on 2026-11-24 on an isolated stack built from the `fix/demo-memory`
branch (own PostgreSQL 16 and Redis containers, own data directory, the
`photonix-dev` image, `ENV=prd DEMO=1`, classifiers enabled):

1. `manage.py migrate`, then `manage.py import_demo_photos`, which downloads the
   14 photos and records them for real analysis.
2. Raw processing, thumbnails and `classify_images` expansion, then each
   classifier type run on its own, one after another, until every task was
   Completed.
3. `manage.py export_demo_fixture`, which refuses while any demo photo has an
   unfinished task, and copying its output here.

To regenerate it (for example after a classifier model changes), repeat the
steps on a throwaway database, never the shared dev database.

## Model versions

From each classifier's `version` attribute at the time of generation:

| Classifier | Version |
|---|---|
| color | 20210206 |
| location | 20190109 |
| style | 20180624 |
| object | 20190407 |
| face | 20210528 |
| event | 20210505 |

## Photos

### Four face photos

These replaced the four face photos of the previous demo. Each is shown with
its Flickr page, the URL the demo downloads, owner and licence. Photos under
CC BY 2.0 are used with attribution as required by the licence; the photos are
shown unmodified (the demo only resizes them into thumbnails).

| Title | Author | Licence | Source page | Download URL | Faces |
|---|---|---|---|---|---|
| "Couple of Grins" | makelessnoise | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | https://www.flickr.com/photos/makelessnoise/171086203/ | https://live.staticflickr.com/67/171086203_386e77b8b7_k.jpg | 2 |
| "We Are Not Cold!" | Alan Levine | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://www.flickr.com/photos/cogdog/45907472935/ | https://live.staticflickr.com/4823/45907472935_1a631bc909_o_d.jpg | 2 |
| "Couple Selfie" | Charles Hutchins | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | https://www.flickr.com/photos/celesteh/40008583563/ | https://live.staticflickr.com/4839/40008583563_0844026bc8_o_d.jpg | 2 |
| "Selfie - I Kid You Not" | kateyhoumiel | [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) | https://www.flickr.com/photos/128404692@N06/41308431822/ | https://live.staticflickr.com/900/41308431822_a4e12585cf_o_d.jpg | 1 (plus a husky) |

"Couple of Grins" uses the `_k` (2048 px) rendition rather than the `_o`
original, because the original carries a wrong EXIF orientation tag. The `_k`
rendition has no EXIF, so this photo's `taken_at` in the fixture (2006-06-14,
the Flickr "Taken on" date) was set from the original's EXIF `DateTimeOriginal`.

### The other ten photos

The founder's own photos on Flickr (user `damianmoore`). Title and licence are
as stated on each Flickr page, checked on 2026-11-24; every page loaded and was
owned by Damian Moore.

| Title | Author | Licence | Source page | Download URL |
|---|---|---|---|---|
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/32439917684/ | https://live.staticflickr.com/767/32439917684_25438930aa_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/33154545171/ | https://live.staticflickr.com/3706/33154545171_ed2a4af283_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/32440369924/ | https://live.staticflickr.com/3849/32440369924_b9e670290a_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/33127783192/ | https://live.staticflickr.com/2892/33127783192_0f73b4aa12_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/32440441724/ | https://live.staticflickr.com/657/32440441724_338aa20dae_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/33155094101/ | https://live.staticflickr.com/744/33155094101_766415ab15_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/33242383206/ | https://live.staticflickr.com/3750/33242383206_7bf8ba68f2_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/32440255904/ | https://live.staticflickr.com/572/32440255904_7ea0605d9e_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/32468418193/ | https://live.staticflickr.com/3771/32468418193_f8ea8caa32_o_d.jpg |
| "Iceland" | Damian Moore (damianmoore) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | https://www.flickr.com/photos/damianmoore/33127591042/ | https://live.staticflickr.com/736/33127591042_2b31fe5d58_o_d.jpg |
