from setuptools import find_packages, setup

install_requires = [
    'django', 'ipython', 'pillow', 'psutil', 'psycopg2-binary',
    'python-redis-lock', 'requests', 'redis', 'rq', 'tensorflow', 'inotify',
    'graphene-django', 'django-filter', 'pyshp', 'matplotlib', 'pytest',
    'pytest-django', 'codecov', 'gunicorn', 'pip'
]

setup(
    name='photonix',
    version='0.2',
    packages=find_packages(),
    description=("WIP"),
    author="Damian Moore",
    author_email="damian@epixstudios.co.uk",
    include_package_data=True,
    zip_safe=False,
    classifiers=[
        "Programming Language :: Python",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
    ],
    install_requires=install_requires, )
