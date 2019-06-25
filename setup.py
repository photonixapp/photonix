import pathlib
import re
from setuptools import find_packages, setup

install_requires = [
    'django', 'ipython', 'pillow', 'psutil', 'psycopg2-binary',
    'python-redis-lock', 'requests', 'redis', 'rq', 'tensorflow', 'inotify',
    'graphene-django', 'django-filter', 'pyshp', 'matplotlib', 'pytest',
    'pytest-django', 'codecov', 'gunicorn', 'pip', 'pyyaml'
]

here = pathlib.Path(__file__).parent
txt = (here / 'photonix' / '__init__.py').read_text('utf-8')
try:
    version = re.findall(r"^__version__ = '([^']+)'\r?$",
                         txt, re.M)[0]
except IndexError:
    raise RuntimeError('Unable to determine version.')

setup(
    name='photonix',
    version=version,
    packages=find_packages(),
    description=("WIP"),
    author="Damian Moore",
    author_email="damian@epixstudios.co.uk",
    include_package_data=True,
    zip_safe=False,
    classifiers=[
        "Programming Language :: Python",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Development Status :: 5 - Production/Stable",
    ],
    install_requires=install_requires,
    entry_points={
        'console_scripts': [
            'photonix = photonix.cli:main',
        ],
    },
)
