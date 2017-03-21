import logging

import inotify.adapters

_DEFAULT_LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

_LOGGER = logging.getLogger(__name__)

PATH = '/home/damian/projects/photo-manager/data'


def _configure_logging():
    _LOGGER.setLevel(logging.DEBUG)

    ch = logging.StreamHandler()

    formatter = logging.Formatter(_DEFAULT_LOG_FORMAT)
    ch.setFormatter(formatter)

    _LOGGER.addHandler(ch)


def _main():
    i = inotify.adapters.InotifyTree(PATH)

    for event in i.event_gen():
        if event is not None:
            (header, type_names, watch_path, filename) = event
            _LOGGER.info("WD=(%d) MASK=(%d) COOKIE=(%d) LEN=(%d) MASK->NAMES=%s "
                         "WATCH-PATH=[%s] FILENAME=[%s]",
                         header.wd, header.mask, header.cookie, header.len, type_names,
                         watch_path.decode('utf-8'), filename.decode('utf-8'))
            if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_FROM', 'IN_MOVED_TO']):
                print('!' * 80)


if __name__ == '__main__':
    _configure_logging()
    _main()
