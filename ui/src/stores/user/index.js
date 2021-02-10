const USER_CHANGED = 'USER_CHANGED'

export function userChanged(user) {
  return {
    type: USER_CHANGED,
    user,
  }
}

const defaultUser = null

const user = (state=defaultUser, action) => {
  switch (action.type) {
    case USER_CHANGED:
      return action.user
    default:
      return state;
  }
}

export default user
