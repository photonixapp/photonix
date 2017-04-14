import { connect } from 'react-redux'
import { runCommand } from '../websockets'
import Footer from '../components/Footer'

const mapStateToProps = (state) => {
  let globalState = state.config.globalState
  let jobsRunning = false
  if (globalState && globalState.photo_dirs_scanning) {
    jobsRunning = true
  }
  let status = ''
  if (globalState && globalState.photo_import_tasks_running) {
    status += 'photo_import_tasks_running:' + globalState.photo_import_tasks_running + ' '
    jobsRunning = true
  }
  if (globalState && globalState.photo_thumbnailer_tasks_running) {
    status += 'photo_thumbnailer_tasks_running:' + globalState.photo_thumbnailer_tasks_running + ' '
    jobsRunning = true
  }

  return {
    status: status,
    jobsRunning: jobsRunning,
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
