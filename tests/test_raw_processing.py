import os
from pathlib import Path

from django.conf import settings
from django.utils import timezone
import pytest

from .factories import LibraryFactory
from photonix.photos.models import PhotoFile, Task
from photonix.photos.utils.fs import download_file
from photonix.photos.utils.raw import generate_jpeg, ensure_raw_processing_tasks, identified_as_jpeg, process_raw_tasks
from photonix.photos.utils.thumbnails import process_generate_thumbnails_tasks


PHOTOS = [
    # -e argument to dcraw means JPEG was extracted without any processing
    ('Adobe DNG Converter - Canon EOS 5D Mark III - Lossy JPEG compression (3_2).DNG',  'dcraw -e', 1236950, ['https://epixstudios.co.uk/uploads/filer_public/36/fa/36fad1f0-8032-45da-bad8-7d9b7d490d99/adobe_dng_converter_-_canon_eos_5d_mark_iii_-_lossy_jpeg_compression_3_2.dng', 'https://raw.pixls.us/getfile.php/1023/nice/Adobe%20DNG%20Converter%20-%20Canon%20EOS%205D%20Mark%20III%20-%20Lossy%20JPEG%20compression%20(3:2).DNG']),
    ('Apple - iPhone 8 - 16bit (4_3).dng',                                              'dcraw -w', 772618, ['https://epixstudios.co.uk/uploads/filer_public/5f/f3/5ff34f05-2c6a-4b5d-a1c5-b0d73f9273d9/apple_-_iphone_8_-_16bit_4_3.dng', 'https://raw.pixls.us/getfile.php/2835/nice/Apple%20-%20iPhone%208%20-%2016bit%20(4:3).dng']),  # No embedded JPEG
    ('Canon - Canon PowerShot SX20 IS.DNG',                                             'dcraw -w', 1828344, ['https://epixstudios.co.uk/uploads/filer_public/4e/28/4e28cab6-0523-48e3-a70b-e5bdaf041bb1/canon_-_canon_powershot_sx20_is.dng', 'https://raw.pixls.us/getfile.php/861/nice/Canon%20-%20Canon%20PowerShot%20SX20%20IS.DNG']),  # Embedded image but low resolution and not a JPEG
    ('Canon - EOS 7D - sRAW2 (sRAW) (3:2).CR2',                                         'dcraw -e', 2264602, ['https://epixstudios.co.uk/uploads/filer_public/7f/a2/7fa2e9d6-a1fc-4ca6-bb19-306c1320c9c4/canon_-_eos_7d_-_sraw2_sraw_32.cr2', 'https://raw.pixls.us/getfile.php/129/nice/Canon%20-%20EOS%207D%20-%20sRAW2%20(sRAW)%20(3:2).CR2']),
    ('Canon - Powershot SX110IS - CHDK.CR2',                                            'dcraw -w', 1493825, ['https://epixstudios.co.uk/uploads/filer_public/ab/6b/ab6b7ff2-f892-4698-add4-3c304142cfa6/canon_-_powershot_sx110is_-_chdk.cr2', 'https://raw.pixls.us/getfile.php/144/nice/Canon%20-%20Powershot%20SX110IS%20-%20CHDK.CR2']),  # No embedded JPEG, No metadata about image dimensions for us to compare against
    ('Leica - D-LUX 5 - 16_9.RWL',                                                      'dcraw -w', 1478207, ['https://epixstudios.co.uk/uploads/filer_public/a5/0f/a50f6ddb-ab72-4e78-8e68-f6131e3a7dcd/leica_-_d-lux_5_-_16_9.rwl', 'https://raw.pixls.us/getfile.php/2808/nice/Leica%20-%20D-LUX%205%20-%2016:9.RWL']),  # Less common aspect ratio, fairly large embedded JPEG but not similar enough to the raw's dimensions
    ('Nikon - 1 J1 - 12bit compressed (Lossy (type 2)) (3_2).NEF',                      'dcraw -e', 635217, ['https://epixstudios.co.uk/uploads/filer_public/a6/7c/a67c538f-254d-4793-862c-4b3dc3bda0ef/nikon_-_1_j1_-_12bit_compressed_lossy_type_2_3_2.nef', 'https://raw.pixls.us/getfile.php/2956/nice/Nikon%20-%201%20J1%20-%2012bit%20compressed%20(Lossy%20(type%202))%20(3:2).NEF']),
    ('Sony - SLT-A77 - 12bit compressed (3_2).ARW',                                     'dcraw -w', 859814, ['https://epixstudios.co.uk/uploads/filer_public/42/a6/42a6b056-7e33-4100-b652-5b96aff8bc22/sony_-_slt-a77_-_12bit_compressed_3_2.arw', 'https://raw.pixls.us/getfile.php/2691/nice/Sony%20-%20SLT-A77%20-%2012bit%20compressed%20(3:2).ARW']),  # Large embedded JPEG but not the right aspect ratio and smaller than raw
]


def test_extract_jpg():
    for fn, intended_process_params, intended_filesize, urls in PHOTOS:
        raw_photo_path = str(Path(__file__).parent / 'photos' / fn)
        if not os.path.exists(raw_photo_path):
            for url in urls:
                try:
                    download_file(url, raw_photo_path)
                    if not os.path.exists(raw_photo_path) or os.stat(raw_photo_path).st_size < 1024 * 1024:
                        try:
                            os.remove(raw_photo_path)
                        except:
                            pass
                    else:
                        break
                except:
                    pass

        output_path, _, process_params, _ = generate_jpeg(raw_photo_path)

        assert process_params == intended_process_params
        assert identified_as_jpeg(output_path) == True
        filesizes = [intended_filesize, os.stat(output_path).st_size]
        assert min(filesizes) / max(filesizes) > 0.8  # Within 20% of the intended JPEG filesize

        os.remove(output_path)


@pytest.fixture
def photo_fixture_raw(db):
    from photonix.photos.utils.db import record_photo
    photo_index = 4  # Photo selected because it doesn't have width and height metadata
    raw_photo_path = str(Path(__file__).parent / 'photos' / PHOTOS[photo_index][0])

    if not os.path.exists(raw_photo_path):
        urls = PHOTOS[photo_index][3]
        for url in urls:
            try:
                download_file(url, raw_photo_path)
                break
            except:
                pass

    library = LibraryFactory()
    return record_photo(raw_photo_path, library)


def test_task_raw_processing(photo_fixture_raw):
    # Task should have been created for the fixture
    task = Task.objects.get(type='ensure_raw_processed', status='P', subject_id=photo_fixture_raw.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None
    assert task.status == 'P'
    assert task.complete_with_children == True

    # Calling this function should create a child task tp generate a JPEG from the raw file
    ensure_raw_processing_tasks()
    parent_task = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_raw.id)
    child_task = Task.objects.get(type='process_raw', parent=parent_task)
    assert parent_task.status == 'S'
    assert child_task.status == 'P'

    # PhotoFile should have been created widthout dimensions as metadata for this photo doesn't include it
    photo_file = PhotoFile.objects.get(id=child_task.subject_id)
    assert photo_file.width is None

    # Call the processing function
    process_raw_tasks()

    # Tasks should be now marked as completed
    parent_task = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_raw.id)
    child_task = Task.objects.get(type='process_raw', parent=parent_task)
    assert parent_task.status == 'C'
    assert child_task.status == 'C'

    # PhotoFile object should have been updated to show raw file has been processed
    photo_file = PhotoFile.objects.get(id=child_task.subject_id)
    assert photo_file.raw_processed == True
    assert photo_file.raw_version == 20190305
    assert photo_file.raw_external_params == 'dcraw -w'
    assert '9.' in photo_file.raw_external_version
    output_path = Path(settings.PHOTO_RAW_PROCESSED_DIR) / '{}.jpg'.format(photo_file.id)
    assert os.path.exists(output_path)
    assert os.path.exists(output_path) == os.path.exists(photo_fixture_raw.base_image_path)
    assert os.stat(output_path).st_size > 1024 * 1024  # JPEG greater than 1MB in size
    assert photo_file.width == 3684  # Width should now be set

    # Thumbnailing task should have been created as ensure_raw_processed and process_raw have completed
    assert Task.objects.filter(type='generate_thumbnails', subject_id=photo_fixture_raw.id).count() == 1
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_raw.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Process tasks to generate thumbnails which should add new task for classification
    process_generate_thumbnails_tasks()
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_raw.id)
    assert task.status == 'C'
    assert (timezone.now() - task.started_at).seconds < 10
    assert (timezone.now() - task.finished_at).seconds < 1

    # Make sure thumbnails got generated
    for thumbnail in settings.THUMBNAIL_SIZES:
        if thumbnail[4]:
            path = photo_fixture_raw.thumbnail_path(thumbnail)
            assert os.path.exists(path)
    thumbnail_path = photo_fixture_raw.thumbnail_path((256, 256, 'cover', 50))
    assert os.stat(thumbnail_path).st_size > 9463 * 0.8
    assert os.stat(thumbnail_path).st_size < 9463 * 1.2

    # Tidy up filesystem
    os.remove(output_path)
    for thumbnail in settings.THUMBNAIL_SIZES:
        if thumbnail[4]:
            path = photo_fixture_raw.thumbnail_path(thumbnail)
            os.remove(path)
