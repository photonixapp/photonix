import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import App from './components/App'
import photoApp from './reducers'
import '../static/css/index.css'
import { getWebsocket, websocketConnect, getConfig, updateConfig } from './actions'
import { getWebsocketBridge, runCommand } from './websockets'

let store = createStore(photoApp)


const webSocketBridge = getWebsocketBridge()


webSocketBridge.listen(function(action, stream) {
  console.log(action, stream)
  if (action.config) {
    store.dispatch(updateConfig(action.config))
  }
})

webSocketBridge._socket.onopen = function() {
  webSocketBridge.send({command: 'get_config'})
}


ReactDOM.render(
  <Provider store={store}>
    <App websocket={webSocketBridge} />
  </Provider>,
  document.getElementById('root')
)
