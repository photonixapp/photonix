import { combineReducers } from 'redux';
import user from './user'
import library from './library'

const reducers = combineReducers({
  user,
  library
})

export default reducers
