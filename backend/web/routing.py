from channels.routing import route

from web.consumers import ws_connect, ws_message, ws_disconnect


channel_routing = [
    # Websocket communication
    route('websocket.connect', ws_connect),
    route('websocket.receive', ws_message),
    route('websocket.disconnect', ws_disconnect),
    # Long-running jobs
    route('rescan-photos', 'photos.consumers.rescan_photos'),
    route('photo-added', 'photos.consumers.photo_added'),
]
