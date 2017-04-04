import json

from channels import Channel, Group

from config.manager import Config
from photos.models import Photo


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
        elif data['command'] == 'get_photos':
            photos = []
            for photo in Photo.objects.all().order_by('-taken_at'):
                thumbnail = photo.files.filter(mimetype='image/jpeg')
                if thumbnail:
                    thumbnail = thumbnail[0].path
                else:
                    thumbnail = None

                photos.append({
                    'id': str(photo.id),
                    'thumbnail': thumbnail,
                })
            message.reply_channel.send({
                'text': json.dumps({
                    'photos': photos,
                })
            })


def ws_connect(message):
    message.reply_channel.send({'accept': True})
    Group('ui').add(message.reply_channel)


def ws_disconnect(message):
    Group('ui').discard(message.reply_channel)
