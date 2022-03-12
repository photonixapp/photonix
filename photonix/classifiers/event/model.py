import sys
from pathlib import Path
from photonix.photos.utils.metadata import (PhotoMetadata, parse_datetime)
import datetime


class EventModel:
    version = 20210505
    approx_ram_mb = 120
    max_num_workers = 2

    def predict(self, image_file):
        metadata = PhotoMetadata(image_file)
        date_taken = None
        possible_date_keys = ['Date/Time Original', 'Date Time Original', 'Date/Time', 'Date Time', 'GPS Date/Time', 'Modify Date', 'File Modification Date/Time']
        for date_key in possible_date_keys:
            date_taken = parse_datetime(metadata.get(date_key))
            if date_taken:
                events = {
                    datetime.date(date_taken.year, 12, 25): "Christmas Day",
                    datetime.date(date_taken.year, 10, 31): "Halloween",
                    datetime.date(date_taken.year, 2, 14): "Valentine's Day",
                    datetime.date(date_taken.year, 12, 31): "New Year Start",
                    datetime.date(date_taken.year, 1, 1): "New Year End",
                }
                if events.get(date_taken.date()):
                    if events.get(date_taken.date()).startswith("New Year"):
                        start_of_day = datetime.datetime.combine(datetime.date(date_taken.year, 12, 31), datetime.datetime.min.time())
                        end_of_day = start_of_day + datetime.timedelta(days=1)
                        if start_of_day <= date_taken.replace(tzinfo=None) <= end_of_day:
                            return ['New Year']
                    return [events.get(date_taken.date())]
        return []

def run_on_photo(photo_id):
    model = EventModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import results_for_model_on_photo, get_or_create_tag

    photo, results = results_for_model_on_photo(model, photo_id)
    if photo:
        from photonix.photos.models import PhotoTag
        photo.clear_tags(source='C', type='E')
        for name in results:
            tag = get_or_create_tag(library=photo.library, name=name, type='E', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=0.5, significance=0.5).save()

    return photo, results


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    _, results = run_on_photo(sys.argv[1])

    print(results)
