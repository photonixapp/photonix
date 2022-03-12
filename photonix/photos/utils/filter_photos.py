from django.db.models import Case, When, Value, IntegerField
from photonix.photos.models import Tag
import datetime
import re

month_dict = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def get_date_elements_from_filters(filter_string):
    """Removed unused words from filter string and return date values if any date exists in filter string."""
    date_elements_dict = {}
    removable_date_filters = []
    for val in filter_string:
        if (":" not in val) and val:
            if (
                (not date_elements_dict.get("date"))
                and bool(re.search(r"\d", val))
                and (
                    val.split(re.sub("\D", "", val))[1].lower()
                    in ["st", "nd", "rd", "th"]
                    or val.isdigit()
                )
                and 1 <= int(re.sub("\D", "", val)) <= 31
            ):
                date_elements_dict.update({"date": re.sub("\D", "", val)})
                removable_date_filters.append(val)
                continue
            if (
                (not date_elements_dict.get("year"))
                and val.isdigit()
                and 1900 <= int(val) <= 2100
            ):
                date_elements_dict.update({"year": val})
                removable_date_filters.append(val)
                continue
            if (
                (not date_elements_dict.get("month"))
                and val.isalpha()
                and len(val) >= 3
            ):
                if val.lower() in month_dict.keys():
                    date_elements_dict.update({"month": month_dict.get(val.lower())})
                    removable_date_filters.append(val)
                else:
                    for month_name in month_dict.keys():
                        if month_name.startswith(val.lower()):
                            date_elements_dict.update(
                                {"month": month_dict.get(month_name)}
                            )
                            removable_date_filters.append(val)
                            break
    return date_elements_dict, removable_date_filters


def filter_photos_queryset(filters, queryset, library_id=None):
    """Method returns photos list."""
    if library_id:
        filters = [
            v
            for v in filters
            if v != "" and v not in ["in", "near", "during", "taken", "on", "of"]
        ]
        queryset = queryset.filter(library__id=library_id)

    date_elements_dict, removable_date_filters = get_date_elements_from_filters(filters)
    selected_tag_id = None
    for filter_val in filters:
        if ":" in filter_val:
            key, val = filter_val.split(":")
            if key == "library_id":
                queryset = queryset.filter(library__id=val)
            elif key == "tag":
                queryset = queryset.filter(photo_tags__tag__id=val)
                if not selected_tag_id:
                    selected_tag_id = val
            elif key == "camera":
                queryset = queryset.filter(camera__id=val)
            elif key == "lens":
                queryset = queryset.filter(lens__id=val)
            elif key == "aperture":
                queryset = queryset.filter(
                    aperture__gte=float(val.split("-")[0]),
                    aperture__lte=float(val.split("-")[1]),
                )
            elif key == "exposure":
                queryset = queryset.filter(exposure__in=val.split("-"))
            elif key == "isoSpeed":
                queryset = queryset.filter(
                    iso_speed__gte=int(val.split("-")[0]),
                    iso_speed__lte=int(val.split("-")[1]),
                )
            elif key == "focalLength":
                queryset = queryset.filter(
                    focal_length__gte=float(val.split("-")[0]),
                    focal_length__lte=float(val.split("-")[1]),
                )
            elif key == "flash":
                queryset = queryset.filter(flash=val == "on" and True or False)
            elif key == "meeteringMode":
                queryset = queryset.filter(metering_mode=val)
            elif key == "driveMode":
                queryset = queryset.filter(drive_mode=val)
            elif key == "shootingMode":
                queryset = queryset.filter(shooting_mode=val)
            elif key == "rating":
                queryset = queryset.filter(
                    star_rating__gte=int(val.split("-")[0]),
                    star_rating__lte=int(val.split("-")[1]),
                )
            elif key == "id":
                queryset = queryset.filter(id=val)
        else:
            if filter_val not in removable_date_filters:
                queryset = queryset.filter(photo_tags__tag__name__icontains=filter_val)
                if (not selected_tag_id) and Tag.objects.filter(
                    name__icontains=filter_val
                ).exists():
                    selected_tag_id = Tag.objects.filter(name__icontains=filter_val)[
                        0
                    ].id

    # Date filtering
    if date_elements_dict.get("month") or date_elements_dict.get("year"):
        if not date_elements_dict.get("year"):
            year = (
                datetime.date.today().year
                if date_elements_dict.get("month") <= datetime.date.today().month
                else datetime.date.today().year - 1
            )
        if date_elements_dict.get("month") and date_elements_dict.get("date"):
            queryset = queryset.filter(
                taken_at__date=str(date_elements_dict.get("year") or year)
                + "-"
                + str(date_elements_dict.get("month"))
                + "-"
                + str(date_elements_dict.get("date"))
            )
        else:
            queryset = queryset.filter(
                taken_at__year=date_elements_dict.get("year") or year
            )
            if date_elements_dict.get("month"):
                queryset = queryset.filter(
                    taken_at__month=date_elements_dict.get("month")
                )

    # Sort so Photos with most matching tags show first
    if selected_tag_id and (not library_id):
        # TODO: Create a score that combines number of matching tags with significance of tags
        # queryset.order_by('-photo_tags__significance')
        queryset = (
            queryset.annotate(
                selected_tag=Case(
                    When(photo_tags__tag__id=selected_tag_id, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            )
            .order_by('selected_tag', '-taken_at')
        )

    return queryset.distinct()


def sort_photos_exposure(exposure_value):
    """
    To sort exposure of photos.
    """
    if '/' in exposure_value:
        return float(exposure_value.split('/')[0]) / float(exposure_value.split('/')[1])
    return float(exposure_value)
