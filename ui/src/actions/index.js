import {castImage} from '../cast'

export const updateGlobalSettings = (globalSettings) => {
  return {
    type: 'UPDATE_GLOBAL_SETTINGS',
    globalSettings: globalSettings,
  }
}
export const updateUserSettings = (userSettings) => {
  return {
    type: 'UPDATE_USER_SETTINGS',
    userSettings: userSettings,
  }
}
export const updateGlobalState = (globalState) => {
  return {
    type: 'UPDATE_GLOBAL_STATE',
    globalState: globalState,
  }
}
export const updateSessionState = (sessionState) => {
  if (sessionState.current_photo) {
    castImage(sessionState.current_photo.id)
  }
  return {
    type: 'UPDATE_SESSION_STATE',
    sessionState: sessionState,
  }
}

export const updateTimeline = (photos) => {
  return {
    type: 'UPDATE_TIMELINE',
    photos: photos,
  }
}

export const updatePhotoDetails = (path) => {
  return {
    type: 'UPDATE_PHOTO_DETAILS',
    path: path,
  }
}
