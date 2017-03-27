import { combineReducers } from 'redux'
import footer from './footer'
import app from './app'

const photoApp = combineReducers({
  app,
  footer,
})

export default photoApp
