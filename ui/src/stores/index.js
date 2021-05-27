import { combineReducers } from 'redux'
import layout from './layout'
import libraries from './libraries'
import photos from './photos'
import user from './user'

const reducers = combineReducers({
  layout,
  libraries,
  photos,
  user,
})

export default reducers
