import { connect } from 'react-redux'
import { runCommand } from '../websockets'
import Footer from '../components/Footer'

const mapStateToProps = (state) => {
  return {
    config: state.footer.config,
    progress: state.footer.progress,
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
