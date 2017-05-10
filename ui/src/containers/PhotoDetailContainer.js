import { connect } from 'react-redux'
import PhotoDetail from '../components/PhotoDetail'

const mapStateToProps = (state) => {
  let sessionState = state.config.sessionState
  let photo = {}
  if (sessionState && sessionState.current_photo) {
    photo = sessionState.current_photo
  }

  return {
    photo: photo,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onPhotoClick: () => {
      dispatch(history.go(-1))
    }
  }
}

const PhotoDetailContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(PhotoDetail)

export default PhotoDetailContainer
