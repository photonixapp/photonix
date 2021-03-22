import { combineReducers } from 'redux'
import libraries from './libraries'
import photos from './photos'
import user from './user'

const reducers = combineReducers({
  libraries,
  photos,
  user,
})

export default reducers
