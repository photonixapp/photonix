export default function updateAction(state, payload) {
  return {
    ...state,
    data: {
      ...state.data,
      ...payload,
    },
  }
}
