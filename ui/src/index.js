import React from 'react'
import ReactDOM from 'react-dom'
import AppContainer from './containers/AppContainer'
import * as serviceWorker from './serviceWorker'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import reducers from './stores'

export const store = createStore(reducers);

ReactDOM.render(
  <Provider store={store}>
    <React.StrictMode>
      <AppContainer />
    </React.StrictMode>
  </Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
