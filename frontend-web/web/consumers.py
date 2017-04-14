import json

from channels import Channel, Group

from config.managers import GlobalSettings, UserSettings, GlobalState
from photos.models import Photo


def ws_message(message):
    data = {}
    if message:
        data = json.loads(message['text'])

    if data.get('command'):
        # Getting settings and state
        if data['command'] == 'get_global_settings':
            message.reply_channel.send({
                'text': json.dumps({
                    'global_settings': GlobalSettings().get_all()
                })
            })
        elif data['command'] == 'get_user_settings':
            message.reply_channel.send({
                'text': json.dumps({
                    'user_settings': UserSettings().get_all()
                })
            })
        elif data['command'] == 'get_global_state':
            message.reply_channel.send({
                'text': json.dumps({
                    'global_state': GlobalState().get_all()
                })
            })

        # Getting UI data
        elif data['command'] == 'get_photos':
            photos = []
            for photo in Photo.objects.all().order_by('-taken_at'):
                photos.append({
                    'id': str(photo.id),
                    'thumbnail': photo.thumbnail_url,
                })
            message.reply_channel.send({
                'text': json.dumps({
                    'photos': photos,
                })
            })
        elif data['command'] == 'get_photo_details':
            print(data)
            photo = Photo.objects.get(id=data['params']['id'])
            message.reply_channel.send({
                'text': json.dumps({
                    'path': photo.file.path,
                })
            })

        # Running jobs
        elif data['command'] == 'rescan_photos':
            Channel('rescan-photos').send({})


def ws_connect(message):
    message.reply_channel.send({'accept': True})
    Group('ui').add(message.reply_channel)


def ws_disconnect(message):
    Group('ui').discard(message.reply_channel)
