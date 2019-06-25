import argparse
import os
import pathlib
import sys
import yaml

import inotify.adapters
import sqlalchemy as sa
from photonix import settings
from photonix import models
from photonix import utils
from photonix.photos.utils.record import record_photo


def attach_debugger():
    """drop to pdb on errors"""
    import sys
    from IPython.core import ultratb
    sys.excepthook = ultratb.AutoFormattedTB(
        mode='Verbose', color_scheme='linux', call_pdb=1
    )


def config_parser_cli(args):
    path = utils.user_config_path()
    if args.paths:
        print(path)
    elif args.edit:
        editor = os.environ.get('EDITOR', 'xdg-open')
        os.execlp(editor, path)
    else:
        if path.exists():
            with open(path) as f:
                config = yaml.full_load(f)
        else:
            config = {}
        if not args.defaults:
            print(yaml.dump(config, default_flow_style=False))
            return
        path = utils.default_config_path()
        with open(path) as f:
            default_config = yaml.full_load(f)
        default_config.update(config)
        print(yaml.dump(default_config, default_flow_style=False))


def initdb_cli(args):
    """Create tables in database"""
    engine = sa.create_engine(settings.DATABASE)
    conn = engine.connect()
    models.Base.metadata.create_all(engine)


def watch_cli(args):
    i = inotify.adapters.InotifyTrees(paths=args.paths)
    engine = sa.create_engine(settings.DATABASE)
    conn = engine.connect()
    Session = sa.orm.sessionmaker(bind=engine)
    session = Session()

    for event in i.event_gen():
        if event is None:
            continue
        header, type_names, watch_path, filename = event
        # if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_FROM', 'IN_MOVED_TO']):  # TODO: Make moving photos really efficient by using the 'from' path
        if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_TO']):
            photo_path = os.path.join(watch_path, filename)
            record_photo(session, photo_path)


def import_cli(args):
    """Import new photos from given path"""
    engine = sa.create_engine(settings.DATABASE)
    conn = engine.connect()
    Session = sa.orm.sessionmaker(bind=engine)
    session = Session()
    for path in args.paths:
        path = pathlib.Path(path)
        print(f"processing path {path}")
        if path.is_file():
            record_photo(conn, path)
        elif path.is_dir():
            for root, dirs, files in os.walk(path):
                for fname in files:
                    entry = pathlib.Path(os.path.join(root, fname))
                    print(f"processing entry {entry}")
                    if entry.is_file():
                        record_photo(conn, entry)


def cli():
    parser = argparse.ArgumentParser(description="Photonix CLI")
    parser.add_argument('--pdb', required=False, action='store_true')
    # collection of shared options
    shared_parser = argparse.ArgumentParser(add_help=False)
    shared_parser.add_argument('--pdb', required=False, action='store_true')
    shared_parser.add_argument('--verbose', '-v', default=1, action='count')
    subparsers = parser.add_subparsers(dest='command')
    # config parser
    config_parser = subparsers.add_parser('config', parents=[shared_parser], aliases=['cfg'], help="photonix config options")
    config_parser.add_argument('--paths', '-p', action='store_true', help="show files that configuration was loaded from")
    config_parser.add_argument('--edit', '-e', action='store_true', help="edit user configuration with $EDITOR")
    config_parser.add_argument('--defaults', '-d', action='store_true', help="include the default configuration")
    config_parser.set_defaults(func=config_parser_cli)
    # initialise database
    initdb = subparsers.add_parser('initdb', parents=[shared_parser], aliases=['syncdb'], help="Initdb and create tables")
    initdb.set_defaults(func=initdb_cli)
    # watch directories for new photos
    watch = subparsers.add_parser('watch', parents=[shared_parser], aliases=['monitor'], help="Watch for new photos")
    watch.set_defaults(func=watch_cli)
    watch.add_argument('paths', nargs='+', help="path to watch for new photos")
    # import photos now
    import_parser = subparsers.add_parser('import', parents=[shared_parser], help="Import new photos")
    import_parser.set_defaults(func=import_cli)
    import_parser.add_argument('paths', nargs='+', help="path to import new photos")
    # handle actual options
    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    return args


def main():
    args = cli()
    if 'pdb' in args and args.pdb:
        attach_debugger()
    args.func(args)


if __name__ == '__main__':
    main()
