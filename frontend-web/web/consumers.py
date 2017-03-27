import json

from channels import Channel, Group

from config.manager import Config


def ws_message(message):
    data = {}
    if message:
        data = json.loads(message['text'])

    if data.get('command'):
        if data['command'] == 'get_config':
            message.reply_channel.send({
                'text': json.dumps({
                    'config': Config().get_all()
                })
            })
        elif data['command'] == 'rescan_photos':
            Channel('rescan-photos').send({})


def ws_connect(message):
    message.reply_channel.send({'accept': True})
    Group('ui').add(message.reply_channel)


def ws_disconnect(message):
    Group('ui').discard(message.reply_channel)
