import { WebSocketBridge } from 'django-channels'
import { updateConfig, updateTimeline} from './actions'


const webSocketBridge = new WebSocketBridge()
webSocketBridge.connect()


export const initWebsocketListener = (store) => {
  webSocketBridge.listen(function(action, stream) {
    console.log(action, stream)
    if (action.config) {
      store.dispatch(updateConfig(action.config))
    }
    if (action.photos) {
      store.dispatch(updateTimeline(action.photos))
    }
  })

  webSocketBridge.socket.onopen = function() {
    webSocketBridge.send({command: 'get_config'})
    webSocketBridge.send({command: 'get_photos'})
  }

}


export const runCommand = (command) => {
  webSocketBridge.send({command: command})
  return {
    type: 'RUN_COMMAND',
    command: command,
  }
}
