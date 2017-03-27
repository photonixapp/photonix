import json
from time import sleep
from channels import Group


def rescan_photos(message):
    Group('ui').send({
        'text': json.dumps({
            'config': {
                'photo_dirs_scanning': True,
            }
        })
    }, immediately=True)

    # TODO: Do the real work here
    sleep(3)

    Group('ui').send({
        'text': json.dumps({
            'config': {
                'photo_dirs_scanning': False,
            }
        })
    })
