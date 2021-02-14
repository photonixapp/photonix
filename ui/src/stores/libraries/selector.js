export const getActiveLibrary = (state) => {
  let library = state.libraries.find((l) => l.isActive === true)
  if (!library) {
    library = state.libraries[0]
  }
  return library
}
