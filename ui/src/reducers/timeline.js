const initialState = {
  photos: [],
}

const timeline = (state = initialState, action) => {
  switch (action.type) {
    case 'UPDATE_TIMELINE':
      console.log(action)
      return {
        photos: action.photos,
      }
    default:
      return state
  }
}

export default timeline
