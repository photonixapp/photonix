const SET_USER = 'SET_USER'

const initialState = {
  user: null,
}

const setUser = (state, payload) => {
  return { ...state, user: payload.user }
}

const user = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_USER:
      return setUser(state, action.payload)
    default:
      return state
  }
}

export default user
