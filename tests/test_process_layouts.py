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


def test_lowmem_layout_has_one_classification_program():
    progs = programs_local(SYSTEM / 'supervisord-lowmem.conf')
    default = programs_local(SYSTEM / 'supervisord.conf')
    core = programs_local(SYSTEM / 'supervisord-core.conf')
    classification = [n for n, c in progs.items() if 'classification' in c]
    assert classification == ['classification_processor']
    assert 'classification_processor' in progs['classification_processor']
    assert 'retrain_face_similarity_index' in progs
    assert set(core) <= set(progs)
    assert set(progs) == set(core) | {'classification_processor', 'retrain_face_similarity_index'}
    # shared programs keep the command they have in the default layout
    for name in set(progs) & set(default):
        assert progs[name] == default[name]


def test_lowmem_include_paths_exist():
    for inc in includes(parse(SYSTEM / 'supervisord-lowmem.conf')):
        assert Path(local(inc)).is_file(), inc


def test_run_sh_selects_layouts_in_order():
    text = (SYSTEM / 'run.sh').read_text()
    disabled = text.index('supervisord-core.conf')
    lowmem = text.index('supervisord-lowmem.conf')
    default = text.index('/etc/supervisord.conf')
    assert disabled < lowmem < default
    assert 'GUNICORN_WORKERS="${GUNICORN_WORKERS:-2}"' in text
    assert 'THUMBNAIL_WORKERS="${THUMBNAIL_WORKERS:-1}"' in text
    assert 'RAW_WORKERS="${RAW_WORKERS:-1}"' in text


def test_run_sh_resets_redis_locks_once_unless_classification_disabled():
    text = (SYSTEM / 'run.sh').read_text()
    reset = 'python /srv/photonix/manage.py reset_redis_locks'
    # One call, guarded so it runs for the default and low-memory layouts
    # but not with CLASSIFICATION_DISABLED=1, before any layout starts
    assert text.count(reset) == 1
    guard = text.index('if [ "${CLASSIFICATION_DISABLED}" != "1" ]; then')
    assert guard < text.index(reset) < text.index('fi', guard)
    assert text.index(reset) < text.index('exec supervisord')


def test_worker_count_env(monkeypatch):
    from photonix.photos.utils.tasks import worker_count
    monkeypatch.delenv('THUMBNAIL_WORKERS', raising=False)
    assert worker_count('THUMBNAIL_WORKERS', 2) >= 1
    monkeypatch.setenv('THUMBNAIL_WORKERS', '1')
    assert worker_count('THUMBNAIL_WORKERS', 2) == 1
    monkeypatch.setenv('THUMBNAIL_WORKERS', '3')
    assert worker_count('THUMBNAIL_WORKERS', 2) == 3
    for bad in ('0', '-1', 'abc', ''):
        monkeypatch.setenv('THUMBNAIL_WORKERS', bad)
        assert worker_count('THUMBNAIL_WORKERS', 2) >= 1
