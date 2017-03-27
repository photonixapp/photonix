const footer = (state = {}, action) => {
  switch (action.type) {
    case 'UPDATE_CONFIG':
      console.log(action)
      return {
        progress: action.progress,
        config: action.config,
      }
    default:
      return state
  }
}

export default footer
