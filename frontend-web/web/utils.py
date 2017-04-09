import json

from channels import Group


def notify(key, val):
    Group('ui').send({
        'text': json.dumps({
            'config': {
                key: val,
            }
        })
    }, immediately=True)
