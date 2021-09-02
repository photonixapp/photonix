const IS_TAG_UPDATE = 'IS_TAG_UPDATE'

const initialState = {updated:false}

const isTagUpdated = (state = initialState, action = {}) => {
  switch (action.type) {
    case IS_TAG_UPDATE:
      state.updated = action.payload.updated
      return state
    default:
      return state
  }
}

export default isTagUpdated
