from channels.routing import route

from web.consumers import ws_connect, ws_message, ws_disconnect


channel_routing = [
    route('websocket.connect', ws_connect),
    route('websocket.receive', ws_message),
    route('websocket.disconnect', ws_disconnect),
    route('rescan-photos', 'photos.consumers.rescan_photos'),
    route('generate-thumbnails-for-photo', 'photos.consumers.generate_thumbnails_for_photo'),
]
