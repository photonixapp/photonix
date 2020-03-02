import React from 'react';
import ReactDOM from 'react-dom';
import AppContainer from './containers/AppContainer'
// import App from './app';
// import App from './reactScrollbar/app'
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<AppContainer />, document.getElementById('root'));
// ReactDOM.render(React.createElement(App, null), document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
