import json

from channels import Channel, Group


def notify_ui(type, data, channel_name=None):
    content = {
        'text': json.dumps({
            type: data
            # TODO: Include timestamp/counter to prevent out of order transmission causing state inconsistencies
        })
    }

    if channel_name:
        Channel(channel_name).send(content, immediately=True)
    else:
        Group('ui').send(content, immediately=True)
