import json

from channels import Channel, Group
from django.conf import settings

from config.managers import global_settings, user_settings, global_state, session_state
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
                    'global_settings': global_settings.get_all()
                })
            })
        elif data['command'] == 'get_user_settings':
            message.reply_channel.send({
                'text': json.dumps({
                    'user_settings': user_settings.get_all()
                })
            })
        elif data['command'] == 'get_global_state':
            print(global_state.get_all())
            message.reply_channel.send({
                'text': json.dumps({
                    'global_state': global_state.get_all()
                })
            })
        elif data['command'] == 'get_session_state':
            message.reply_channel.send({
                'text': json.dumps({
                    'session_state': session_state.get_all()
                })
            })

        # Getting UI data
        elif data['command'] == 'get_photos':
            photos = []
            for photo in Photo.objects.filter(last_thumbnailed_at__isnull=False).order_by('-taken_at'):
                photos.append({
                    'id': str(photo.id),
                    'thumbnail': photo.thumbnail_url(settings.THUMBNAIL_SIZES[0]),
                    'location': [getattr(photo.location, 'y', None), getattr(photo.location, 'x', None)],
                })
            session_state.set('photos', photos, message.reply_channel.name)
        elif data['command'] == 'get_photo_details':
            photo = Photo.objects.get(id=data['params']['id'])
            data = {
                'id':       str(photo.id),
                'path':     photo.file.path,
                'taken_by': photo.taken_by,
            }
            session_state.set('current_photo', data, message.reply_channel.name)

        # Running jobs
        elif data['command'] == 'rescan_photos':
            Channel('rescan-photos').send({})


def ws_connect(message):
    message.reply_channel.send({'accept': True})
    Group('ui').add(message.reply_channel)


def ws_disconnect(message):
    Group('ui').discard(message.reply_channel)
