import { connect } from 'react-redux'
import { runCommand } from '../websockets'
import Timeline from '../components/Timeline'

const mapStateToProps = (state) => {
  return {
    photos: state.timeline.photos,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onPhotoClick: (id) => {
      dispatch(alert('onPhotoClick ' + id))
    }
  }
}

const TimelineContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Timeline)

export default TimelineContainer
