import { connect } from 'react-redux'
import { runCommand } from '../websockets'
import Timeline from '../components/Timeline'

const mapStateToProps = (state) => {
  let sessionState = state.config.sessionState
  let photos = []
  if (sessionState && sessionState.photos) {
    photos = sessionState.photos
  }
  return {
    photos: photos,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onPhotoClick: (id) => {
      dispatch(runCommand('get_photo_details', {id: id}))
    }
  }
}

const TimelineContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Timeline)

export default TimelineContainer
