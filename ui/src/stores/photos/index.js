const SET_PHOTOS = 'SET_PHOTOS'

const initialState = {
  photos: [],
  photosDetail: []
}

const photos = (state = initialState, action = {}) => {
  
  switch (action.type) {
    case SET_PHOTOS:
      return {...state, photos: action.payload.ids, photosDetail:action.payload.photoList}
    default:
      return state
  }
}

export default photos
