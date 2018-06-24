const webSocketBridge = new channels.WebSocketBridge()
webSocketBridge.connect()

webSocketBridge.listen(function(action, stream) {
  console.log(action, stream)
  if (action.config)
    if (action.config.hasOwnProperty('photo_dirs_scanning')) {
      document.getElementById('photo-dirs-scanning').innerHTML = action.config.photo_dirs_scanning
    }
    if (action.config.hasOwnProperty('cache_dir')) {
      document.getElementById('cache-dir').innerHTML = action.config.cache_dir
    }
  }
)

webSocketBridge._socket.onopen = function() {
  webSocketBridge.send({command: 'get_config'})
}

document.getElementById('rescan-photos').onclick = function() {
  webSocketBridge.send({command: 'rescan_photos'})
}
