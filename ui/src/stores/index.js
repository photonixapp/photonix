import { combineReducers } from 'redux'
import layout from './layout'
import libraries from './libraries'
import photos from './photos'
import user from './user'
import photoUploading  from './photoUploading'
import isTagUpdated from "./tag";

const reducers = combineReducers({
  layout,
  libraries,
  photos,
  user,
  photoUploading,
  isTagUpdated,
})

export default reducers
