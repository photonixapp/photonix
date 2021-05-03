const SET_SAFE_AREA_TOP = 'SET_SAFE_AREA_TOP'

const initialState = {
  isMobileApp: navigator.userAgent.indexOf('PhotonixMobileApp') > -1,
  safeAreaTop: 0,
}

const layout = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_SAFE_AREA_TOP:
      return { ...state, safeAreaTop: action.payload }
    default:
      return state
  }
}

export default layout
