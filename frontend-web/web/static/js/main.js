const webSocketBridge = new channels.WebSocketBridge()
webSocketBridge.connect()
webSocketBridge.listen(function(action, stream) {
  console.log(action, stream)
  if (action.config) {
    console.log(action.config.photo_dirs_scanning)
    document.getElementById('photo-dirs-scanning').innerHTML = action.config.photo_dirs_scanning
  }
})

window.onload = function() {
  webSocketBridge._socket.onopen = function() {
    webSocketBridge.send({command: 'get_config'})
  }
}

document.getElementById('rescan-photos').onclick = function() {
  webSocketBridge.send({command: 'rescan_photos'})
}
