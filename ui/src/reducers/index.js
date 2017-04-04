import { combineReducers } from 'redux'
import app from './app'
import timeline from './timeline'
import footer from './footer'

const photoApp = combineReducers({
  app,
  timeline,
  footer,
})

export default photoApp
