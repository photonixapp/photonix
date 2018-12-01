import React  from 'react'
import MapView from '../components/MapView'


export default class MapContainer extends React.Component {
  onChange (e) {
    let bounds = this.getBounds()
    bounds = [
      bounds._southWest.lat,
      bounds._southWest.lng,
      bounds._northEast.lat,
      bounds._northEast.lng,
    ]
    console.log(bounds)
    // dispatch(runCommand('get_photos_by_bounds', { bounds: bounds }))
  }

  render() {
    return <MapView photos={this.props.photos} />
  }
}
