export const getIsMobileApp = (state) => state.layout.isMobileApp
export const getSafeArea = (state) => ({
  top: state.layout.safeAreaTop,
  right: 0,
  bottom: 0,
  left: 0,
})
