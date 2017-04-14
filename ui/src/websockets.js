import { WebSocketBridge } from 'django-channels'
import { updateGlobalSettings, updateUserSettings, updateGlobalState, updateSessionState, updateTimeline} from './actions'


const webSocketBridge = new WebSocketBridge()
webSocketBridge.connect()


export const initWebsocketListener = (store) => {
  webSocketBridge.listen(function(action, stream) {
    if (action.global_settings) {
      store.dispatch(updateGlobalSettings(action.global_settings))
    }
    if (action.user_settings) {
      store.dispatch(updateUserSettings(action.user_settings))
    }
    if (action.global_state) {
      let oldState = store.getState()
      let oldNumTasks = 0
      if (oldState.config && oldState.config.globalState && oldState.config.globalState.photo_thumbnailer_tasks_running) {
        oldNumTasks = oldState.config.globalState.photo_thumbnailer_tasks_running
      }
      store.dispatch(updateGlobalState(action.global_state))
      if (action.global_state.photo_thumbnailer_tasks_running < oldNumTasks) {
        setTimeout(function() {
          webSocketBridge.send({command: 'get_photos'})
        }, 500)
      }
    }
    if (action.session_state) {
      store.dispatch(updateSessionState(action.session_state))
    }
    if (action.photos) {
      store.dispatch(updateTimeline(action.photos))
    }
  })

  webSocketBridge.socket.onopen = function() {
    webSocketBridge.send({command: 'get_global_settings'})
    webSocketBridge.send({command: 'get_user_settings'})
    webSocketBridge.send({command: 'get_global_state'})
    webSocketBridge.send({command: 'get_photos'})
  }

}


export const runCommand = (command, params) => {
  webSocketBridge.send({command: command, params: params})
  return {
    type: 'RUN_COMMAND',
    command: command,
  }
}
