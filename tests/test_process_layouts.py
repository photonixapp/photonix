import configparser
from pathlib import Path

SYSTEM = Path(__file__).resolve().parent.parent / 'system'

DEFAULT_PROGRAMS = {
    'nginx', 'app_server', 'retrain_face_similarity_index', 'vite', 'watch_photos',
    'raw_scheduler', 'raw_processor', 'thumbnail_scheduler', 'classification_scheduler',
    'classification_color_processor', 'classification_location_processor',
    'classification_face_detection_processor', 'classification_style_processor',
    'classification_object_processor', 'classification_event_processor',
    'rescan_photos_periodically',
}


def parse(path):
    # interpolation=None: supervisord uses %(...)s syntax that configparser would choke on
    cp = configparser.ConfigParser(interpolation=None)
    cp.read(path)
    return cp


def includes(cp):
    return cp.get('include', 'files').split()


def local(path):
    """Map the in-container /srv/system path to this checkout."""
    assert path.startswith('/srv/system/')
    return str(SYSTEM / path[len('/srv/system/'):])


def programs_local(path):
    cp = parse(path)
    result = {}
    for section in cp.sections():
        if section.startswith('program:'):
            name = section[len('program:'):]
            assert name not in result
            result[name] = cp.get(section, 'command')
    for inc in includes(cp) if cp.has_section('include') else []:
        for name, cmd in programs_local(local(inc)).items():
            assert name not in result, f'{name} defined twice'
            result[name] = cmd
    return result


def test_include_paths_exist():
    for conf in ('supervisord.conf', 'supervisord-core.conf'):
        for inc in includes(parse(SYSTEM / conf)):
            assert Path(local(inc)).is_file(), inc


def test_default_layout_has_the_sixteen_programs():
    progs = programs_local(SYSTEM / 'supervisord.conf')
    assert set(progs) == DEFAULT_PROGRAMS
    assert len(progs) == 16


def test_core_layout_has_no_classification_programs():
    progs = programs_local(SYSTEM / 'supervisord-core.conf')
    assert progs, 'core layout is empty'
    for name, command in progs.items():
        assert 'classification' not in command, name
        assert 'retrain_face' not in command, name
        assert 'classification' not in name, name
    assert {'nginx', 'app_server', 'vite'} <= set(progs)


def test_core_is_subset_of_default_with_same_commands():
    default = programs_local(SYSTEM / 'supervisord.conf')
    core = programs_local(SYSTEM / 'supervisord-core.conf')
    for name, command in core.items():
        assert default[name] == command


def test_gunicorn_workers_and_vite_idle():
    assert '${GUNICORN_WORKERS:-8}' in (SYSTEM / 'run_app_server.sh').read_text()
    assert 'sleep infinity' in (SYSTEM / 'run_vite_server.sh').read_text()


def test_memory_report_is_executable():
    assert (SYSTEM / 'memory_report.sh').stat().st_mode & 0o111
