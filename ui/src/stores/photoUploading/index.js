const initialState = { loading: false, progressVal: null }
const photoUploading = (state = initialState, action) => {
  switch (action.type) {
    case 'UPLOADING':
      !action.loading && (state.progressVal = null);
      return {
        ...state,
        loading: action.loading
      }
    case 'PROGRESS':
      return {
        ...state,
        progressVal: action.progressVal
      }
    default:
      return state
  }
}

export default photoUploading;