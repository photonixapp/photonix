import os
from pathlib import Path

from photos.utils.fs import download_file, md5sum
from photos.utils.raw import generate_jpeg, process_ensure_raw_processed_tasks, identified_as_jpeg


PHOTOS = [
    # -e argument to dcraw means JPEG was extracted without any processing
    ('Adobe DNG Converter - Canon EOS 5D Mark III - Lossy JPEG compression (3_2).DNG',  'dcraw -e', '4ed8baf18cdd56a6aed60add0fac6968', 'https://raw.pixls.us/getfile.php/1023/nice/Adobe%20DNG%20Converter%20-%20Canon%20EOS%205D%20Mark%20III%20-%20Lossy%20JPEG%20compression%20(3:2).DNG'),
    ('Apple - iPhone 8 - 16bit (4_3).dng',                                              'dcraw -w', '493927e3d9f3271844aa6311f6bf2192', 'https://raw.pixls.us/getfile.php/2835/nice/Apple%20-%20iPhone%208%20-%2016bit%20(4:3).dng'),  # No embedded JPEG
    ('Canon - Canon PowerShot SX20 IS.DNG',                                             'dcraw -w', 'a4366fa2f2989b908ffeaa0a7222e730', 'https://raw.pixls.us/getfile.php/861/nice/Canon%20-%20Canon%20PowerShot%20SX20%20IS.DNG'),  # Embedded image but low resolution and not a JPEG
    ('Canon - EOS 7D - sRAW2 (sRAW) (3:2).CR2',                                         'dcraw -e', 'bd3fea312d610a1e074312cd695cbded', 'https://raw.pixls.us/getfile.php/129/nice/Canon%20-%20EOS%207D%20-%20sRAW2%20(sRAW)%20(3:2).CR2'),
    ('Canon - Powershot SX110IS - CHDK.CR2',                                            'dcraw -w', '8c968fbaeebd43e8d03aba18870cfde5', 'https://raw.pixls.us/getfile.php/144/nice/Canon%20-%20Powershot%20SX110IS%20-%20CHDK.CR2'),  # No embedded JPEG, No metadata about image dimensions for us to compare against
    ('Leica - D-LUX 5 - 16_9.RWL',                                                      'dcraw -w', '09a6e126ae0b9271bcca5a1d08ff3d2b', 'https://raw.pixls.us/getfile.php/2808/nice/Leica%20-%20D-LUX%205%20-%2016:9.RWL'),  # Less common aspect ratio, fairly large embedded JPEG but not similar enough to the raw's dimensions
    ('Nikon - 1 J1 - 12bit compressed (Lossy (type 2)) (3_2).NEF',                      'dcraw -e', 'c336ee636316ab7db5887a01fff51625', 'https://raw.pixls.us/getfile.php/2956/nice/Nikon%20-%201%20J1%20-%2012bit%20compressed%20(Lossy%20(type%202))%20(3:2).NEF'),
    ('Sony - SLT-A77 - 12bit compressed (3_2).ARW',                                     'dcraw -w', 'bdf161607e8eba0e50cbaafa5237acab', 'https://raw.pixls.us/getfile.php/2691/nice/Sony%20-%20SLT-A77%20-%2012bit%20compressed%20(3:2).ARW'),  # Large embedded JPEG but not the right aspect ratio and smaller than raw
]


def test_extract_jpg():
    for fn, intended_process_params, intended_hash, url in PHOTOS:
        raw_photo_path = str(Path(__file__).parent / 'photos' / fn)
        if not os.path.exists(raw_photo_path):
            download_file(url, raw_photo_path)

        output_path, process_params = generate_jpeg(raw_photo_path)
        output_hash = md5sum(output_path)

        assert process_params == intended_process_params
        assert output_hash == intended_hash
        assert identified_as_jpeg(output_path) == True

        os.remove(output_path)
