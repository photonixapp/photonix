import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import App from './components/App'
import photoApp from './reducers'
import '../static/css/index.css'
import { initWebsocketListener } from './websockets'


let store = createStore(photoApp)

initWebsocketListener(store)


ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
