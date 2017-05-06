import { connect } from 'react-redux'
import { runCommand } from '../websockets'
import MapView from '../components/MapView'

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

const MapContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(MapView)

export default MapContainer
