import { combineReducers } from 'redux'
import app from './app'
import config from './config'

const photoApp = combineReducers({
  config,
  app,
})

export default photoApp
