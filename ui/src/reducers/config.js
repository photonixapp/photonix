const config = (state = {}, action) => {
  switch (action.type) {
    case 'UPDATE_GLOBAL_SETTINGS':
      return Object.assign({}, state, {
        globalSettings: Object.assign({}, state.globalSettings, action.globalSettings),
      })
    case 'UPDATE_USER_SETTINGS':
      return Object.assign({}, state, {
        userSettings: Object.assign({}, state.userSettings, action.userSettings),
      })
    case 'UPDATE_GLOBAL_STATE':
      return Object.assign({}, state, {
        globalState: Object.assign({}, state.globalState, action.globalState),
      })
    case 'UPDATE_SESSION_STATE':
      return Object.assign({}, state, {
        sessionState: Object.assign({}, state.sessionState, action.sessionState),
      })
    default:
      return state
  }
}

export default config
