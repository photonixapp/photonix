const app = (state = {}, action) => {
  switch (action.type) {
    case 'RUN_COMMAND':
      console.log(action)
      return {
        command: action.command,
      }
    default:
      return state
  }
}

export default app
