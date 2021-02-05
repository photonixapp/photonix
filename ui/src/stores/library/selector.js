export const getActiveLibrary = (state) => {
  return state.library.find((l) => l.isActive === true)
}
