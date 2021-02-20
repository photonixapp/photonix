const SET_LIBRARIES = 'SET_LIBRARIES'
const SET_ACTIVE_LIBRARY = 'SET_ACTIVE_LIBRARY'

const initialState = []

const updateActiveLibrary = (state, payload) => {
  localStorage.setItem('activeLibrary', payload.id)
  const libs = state.map((lib) => {
    lib.isActive = lib.id === payload.id ? true : false
    return lib
  })
  return libs
}

const libraries = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_LIBRARIES:
      return action.payload
    case SET_ACTIVE_LIBRARY:
      return updateActiveLibrary(state, action.payload)
    default:
      return state
  }
}

export default libraries
