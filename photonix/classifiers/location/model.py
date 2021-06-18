import csv
import math
from pathlib import Path
import sys

import matplotlib.path as mpltPath
import shapefile

from photonix.photos.utils.metadata import PhotoMetadata, parse_gps_location
from photonix.classifiers.base_model import BaseModel


WORLD_FILE = Path('location') / 'TM_WORLD_BORDERS-0.3.shp'  # http://thematicmapping.org/downloads/world_borders.php
CITIES_FILE = Path('location') / 'cities1000.txt'  # http://download.geonames.org/export/dump/


class LocationModel(BaseModel):
    name = 'location'
    version = 20190109
    approx_ram_mb = 100
    max_num_workers = 4

    def __init__(self, model_dir=None, world_file=WORLD_FILE, cities_file=CITIES_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        world_file = str(Path(self.model_dir) / world_file)
        cities_file = str(Path(self.model_dir) / cities_file)

        if self.ensure_downloaded(lock_name=lock_name):
            self.world = self.load_world(world_file)
            self.cities = self.load_cities(cities_file)

    def load_world(self, world_file):
        return shapefile.Reader(world_file, encoding='latin1').shapeRecords()

    def load_cities(self, cities_file):
        rows = []
        with open(cities_file) as csvfile:
            reader = csv.reader(csvfile, delimiter='\t')
            for row in reader:
                rows.append(row)
        return rows

    def predict(self, image_file=None, location=None):
        if location:
            lon, lat = location
        else:
            metadata = PhotoMetadata(image_file)
            location = metadata.get('GPS Position') and parse_gps_location(metadata.get('GPS Position')) or None
            if location:
                lon, lat = location
            else:
                return {
                    'country': None,
                    'city': None,
                }

        country = self.get_country(lon=lon, lat=lat)
        if country:
            city = self.get_city(lon=lon, lat=lat, country_code=country['code'])
        else:
            city = self.get_city(lon=lon, lat=lat)

        if not country and city:
            country = {
                'name': city['country_name'],
            }

        return {
            'country': country,
            'city': city,
        }

    def get_country(self, lon, lat):
        # Using country border polygons, returns the country that contains the
        # given point.
        location = [[lat, lon]]
        for shape_rec in self.world:
            shape = shape_rec.shape
            record = shape_rec.record
            points = shape.points

            if shape.shapeTypeName == 'POLYGON':
                polygons = self.split_country_points(points)
                for polygon in polygons:
                    path = mpltPath.Path(polygon)
                    inside = path.contains_points(location)[0]
                    if inside:
                        return {
                            'name': record[4],
                            'code': record[1],
                        }
        return None

    def get_city(self, lon, lat, country_code=None):
        # Gets the city within a 10km radius that has the highest population.
        # It can be limited to a particular country.
        nearest_distance = None
        largest_population = 0
        largest_city = None
        chosen_country_code = None
        chosen_country_name = None
        countries = {row.record[1]: row.record[4] for row in self.world}

        for row in self.cities:
            if not country_code or country_code == row[8]:
                longitude = float(row[4])
                latitude = float(row[5])

                distance = int(self.haversine([lon, lat], [longitude, latitude]))
                if distance < 10000:
                    population = int(row[14])
                    if population > largest_population:
                        largest_population = population
                        largest_city = row[1]
                        chosen_country_code = row[8]
                        chosen_country_name = countries[chosen_country_code]

                if nearest_distance is None or distance < nearest_distance:
                    nearest_distance = distance

        if largest_city:
            return {
                'name': largest_city,
                'distance': nearest_distance,
                'population': largest_population,
                'country_code': chosen_country_code,
                'country_name': chosen_country_name,
            }
        return None

    def split_country_points(self, points):
        # The country shapes have multiple polygons within them. We split the
        # polygons when we see the first point reoccur.
        point_groups = []
        pos = 0
        try:
            while True:
                first_point = points[pos]
                last_pos = points[pos + 1:].index(first_point) + pos + 1
                point_groups.append(points[pos:last_pos])
                pos = last_pos + 1

                if pos >= len(points):
                    break
            return point_groups
        except ValueError:  # No matching end point so return single polygon
            return [points]

    def haversine(self, coord1, coord2):
        # Calculate distance in meters. This is a bit simplistic as it assumes
        # a sherical world but we believe this to not have much impact for how
        # we use it.
        R = 6372800
        lat1, lon1 = coord1
        lat2, lon2 = coord2

        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2)*math.sin(dlambda/2)**2
        return 2*R*math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def export_country_kml(self, country, path):
        # Useful for debugging country borders. The exported KML can be viewed
        # online.
        for shape_rec in self.world.shapeRecords():
            shape = shape_rec.shape
            record = shape_rec.record

            if record[4] == country:
                polygons = self.split_country_points(shape.points)
                with open(path, 'w') as f:
                    f.write('''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>{}</name>
    <MultiGeometry>'''.format(country))
                    for polygon in polygons:
                        f.write('''
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>relativeToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>\n''')
                        for point in polygon:
                            f.write('{},{},100\n'.format(point[0], point[1]))
                        f.write('''
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>''')
                    f.write('''
    </MultiGeometry>
  </Placemark>
</kml>\n''')
                break


def run_on_photo(photo_id):
    model = LocationModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import results_for_model_on_photo, get_or_create_tag
    photo, results = results_for_model_on_photo(model, photo_id)

    if photo and results['country']:
        from photonix.photos.models import PhotoTag
        photo.clear_tags(source='C', type='L')
        country_tag = get_or_create_tag(library=photo.library, name=results['country']['name'], type='L', source='C')
        PhotoTag(photo=photo, tag=country_tag, source='C', confidence=1.0, significance=1.0).save()
        if results['city']:
            city_tag = get_or_create_tag(library=photo.library, name=results['city']['name'], type='L', source='C', parent=country_tag)
            PhotoTag(photo=photo, tag=city_tag, source='C', confidence=0.5, significance=0.5).save()

    return photo, results


if __name__ == '__main__':
    model = LocationModel()
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    if ',' in sys.argv[1]:
        location = sys.argv[1].split(',')
        location = [float(loc) for loc in location]
        result = model.predict(location=location)
    else:
        result = run_on_photo(sys.argv[1])

    print(result)
