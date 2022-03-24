const SET_PHOTOS = 'SET_PHOTOS'

const initialState = {
  photos: [],
  photosDetail: [],
}

const photos = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_PHOTOS:
      state.photosDetail.filter((el) => {
        return action.payload.photoList.findIndex(
          (node) => el.node.id === node.node.id
        )
      })
      return {
        ...state,
        photos: Array.from(new Set([...state.photos, ...action.payload.ids])),
        photosDetail: [...state.photosDetail, ...action.payload.photoList],
      }

    default:
      return state
  }
}

export default photos
