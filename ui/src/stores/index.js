import { combineReducers } from 'redux'
import user from './user'
import libraries from './libraries'

const reducers = combineReducers({
  user,
  libraries,
})

export default reducers
