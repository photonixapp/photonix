import { connect } from 'react-redux'
import { runCommand } from '../websockets'
import Footer from '../components/Footer'

const mapStateToProps = (state) => {
  let config = state.footer.config
  let backgroundRunning = false
  if (config && config.photo_dirs_scanning) {
    backgroundRunning = true
  }

  return {
    config: config,
    progress: state.footer.progress,
    backgroundRunning: backgroundRunning,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onFooterClick: (id) => {
      dispatch(runCommand('rescan_photos'))
    }
  }
}

const FooterContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Footer)

export default FooterContainer
