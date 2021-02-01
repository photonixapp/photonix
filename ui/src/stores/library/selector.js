export const getActiveLibrary = (state) =>
  state.library.find((l) => l.isActive === true)
