import os
from pathlib import Path
import sys

import pytest


sys.path.insert(0, str(Path(__file__).parent.resolve()))
os.environ['ENV'] = 'test'


if __name__ == '__main__':
    pytest_args = []
    has_target = False
    for arg in sys.argv[1:]:
        # Pass pytest options like -k/-x and their values straight through;
        # expand bare test module names like 'test_metadata' as a convenience
        if not arg.startswith('-'):
            if '/' in arg:
                has_target = True
            else:
                path, sep, rest = arg.partition('::')
                if not path.endswith('.py'):
                    path += '.py'
                if (Path(__file__).parent / 'tests' / path).exists():
                    arg = 'tests/' + path + sep + rest
                    has_target = True
        pytest_args.append(arg)
    if not has_target:
        pytest_args.append('tests')

    cov = None
    if os.environ.get('COVERAGE'):
        import tempfile
        import coverage
        # Config lives here rather than in a .coveragerc because the dev
        # container only mounts selected paths, not the repository root.
        # The data file defaults somewhere writable as the source tree may
        # be mounted read-only in the container.
        data_file = os.environ.get('COVERAGE_FILE') or os.path.join(tempfile.mkdtemp(), 'coverage.dat')
        cov = coverage.Coverage(
            data_file=data_file,
            source=['photonix'],
            omit=[
                '*/migrations/*',
                'photonix/manage.py',
                'photonix/web/wsgi.py',
                'photonix/web/settings.py',
                'photonix/web/test_settings.py',
            ],
        )
        cov.start()

    result = pytest.main(pytest_args)

    if cov:
        cov.stop()
        cov.save()
        print()
        cov.report()

    exit(result)
