import json

from channels import Group


def notify_ui(type, data):
    Group('ui').send({
        'text': json.dumps({
            type: json.dumps(data)
            # TODO: Include timestamp/counter to prevent out of order transmission causing state inconsistencies
        })
    }, immediately=True)
