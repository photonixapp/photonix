import math
from pathlib import Path
import sys

import matplotlib.path as mpltPath
import numpy as np
import shapefile

from photonix.photos.utils.metadata import PhotoMetadata, parse_gps_location
from photonix.classifiers.base_model import BaseModel
from photonix.classifiers.location.cities_dataset import (
    CityData,
    city_data_from_rows,
    load_cities_bin,
)


WORLD_FILE = Path('location') / 'TM_WORLD_BORDERS-0.3.shp'  # http://thematicmapping.org/downloads/world_borders.php
# Compact binary artifact built offline from GeoNames cities1000.txt
# (http://download.geonames.org/export/dump/) - see scripts/build_location_cities.py
CITIES_FILE = Path('location') / 'cities.bin'


class LocationModel(BaseModel):
    name = 'location'
    version = 20260719
    approx_ram_mb = 100
    max_num_workers = 4

    def __init__(self, model_dir=None, world_file=WORLD_FILE, cities_file=CITIES_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        self._world_file = str(Path(self.model_dir) / world_file)
        self._cities_file = str(Path(self.model_dir) / cities_file)
        self._lock_name = lock_name
        self.world = None
        self.cities = None
        self.countries = None

        # Download model files eagerly (cheap), but don't load into memory yet
        self.ensure_downloaded(lock_name=lock_name)

    def load(self):
        self.world = self.load_world(self._world_file)
        self.cities = self.load_cities(self._cities_file)
        # Cache the country-code -> country-name lookup once at load time
        # instead of rebuilding it on every get_city() call.
        self.countries = {row.record[1]: row.record[4] for row in self.world}

    def load_world(self, world_file):
        return shapefile.Reader(world_file, encoding='latin1').shapeRecords()

    def load_cities(self, cities_file):
        return load_cities_bin(cities_file)

    def predict(self, image_file=None, location=None, photo_file=None):
        self._ensure_loaded()  # Lazy load on first use

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

        if not country and city and city.get('country_name'):
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
        #
        # This is a vectorised (numpy) reimplementation of the original
        # per-row loop. It preserves the exact behaviour bit-for-bit:
        #   * distances are int()-truncated metres from the same haversine,
        #   * only cities strictly closer than 10km are candidates,
        #   * the winner is the largest population, ties broken by first
        #     appearance in file order,
        #   * a city with population 0 is never chosen (matches the original
        #     `population > largest_population` with largest starting at 0),
        #   * nearest_distance is the smallest truncated distance over every
        #     row considered (after the optional country filter), regardless
        #     of the 10km radius.
        data = self.cities if isinstance(self.cities, CityData) else city_data_from_rows(self.cities)

        if country_code:
            selected = np.nonzero(data.codes == country_code)[0]
            if selected.size == 0:
                return None
            col4 = data.col4[selected]
            col5 = data.col5[selected]
            populations = data.populations[selected]
        else:
            selected = None
            col4 = data.col4
            col5 = data.col5
            populations = data.populations

        if col4.shape[0] == 0:
            return None

        # Vectorised haversine, matching self.haversine([lon, lat],
        # [row[4], row[5]]) exactly. Multiplying by math.pi / 180 (rather than
        # np.radians) guarantees the degree->radian step is bit-identical to
        # math.radians, and float64 sin/cos/atan2/sqrt match the math module.
        deg2rad = math.pi / 180.0
        R = 6372800.0
        cos_phi1 = math.cos(lon * deg2rad)
        phi2 = col4 * deg2rad
        dphi = (col4 - lon) * deg2rad
        dlambda = (col5 - lat) * deg2rad
        a = np.sin(dphi / 2) ** 2 + cos_phi1 * np.cos(phi2) * np.sin(dlambda / 2) ** 2
        # Floating-point rounding can push `a` fractionally above 1 for
        # near-antipodal pairs; sqrt(1 - a) would then be NaN, and NaN cast to
        # int64 is undefined (INT64_MIN on x86-64, which would "win" the
        # nearest-city comparison). Clamp into the valid haversine domain.
        a = np.clip(a, 0.0, 1.0)
        distances = (2 * R * np.arctan2(np.sqrt(a), np.sqrt(1 - a))).astype(np.int64)

        nearest_distance = int(distances.min())

        within = distances < 10000
        # -1 sentinel keeps out-of-radius rows (and, via the check below, the
        # population==0 case) from ever winning argmax; argmax returns the first
        # maximum, giving first-in-file-order tie-breaking.
        candidate_pop = np.where(within, populations, -1)
        best = int(np.argmax(candidate_pop))
        if candidate_pop[best] <= 0:
            return None

        original_index = int(selected[best]) if selected is not None else best
        chosen_country_code = data.codes[original_index]

        # Country codes added after the world borders dataset was published
        # (e.g. XK, SS) aren't in it, so .get() may return None. Prefer the
        # dict cached at load time; fall back to building it from the world
        # borders (e.g. when a caller wires up the model manually).
        countries = getattr(self, 'countries', None)
        if countries is None:
            countries = {row.record[1]: row.record[4] for row in self.world}

        return {
            'name': data.names[original_index],
            'distance': nearest_distance,
            'population': int(populations[best]),
            'country_code': chosen_country_code,
            'country_name': countries.get(chosen_country_code),
        }

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


def save_tags(photo, results, model):
    from photonix.classifiers.runners import get_or_create_tag
    from photonix.photos.models import PhotoTag

    country_tag = get_or_create_tag(library=photo.library, name=results['country']['name'], type='L', source='C')
    PhotoTag(photo=photo, tag=country_tag, source='C', confidence=1.0, significance=1.0).save()
    if results['city']:
        city_tag = get_or_create_tag(library=photo.library, name=results['city']['name'], type='L', source='C', parent=country_tag)
        PhotoTag(photo=photo, tag=city_tag, source='C', confidence=0.5, significance=0.5).save()


def run_on_photo(photo_id):
    from photonix.classifiers.runners import run_classifier_on_photo
    # No country means no GPS position was found - keep any existing tags
    return run_classifier_on_photo('location', LocationModel, photo_id, 'L', save_tags,
                                   has_results=lambda results: bool(results['country']))


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
