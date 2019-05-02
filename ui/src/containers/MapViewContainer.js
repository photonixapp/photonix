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
    // Calculate the maximum boundary of the photo points
    let top = null
    let bottom = null
    let left = null
    let right = null

    if (this.props.photos) {
      this.props.photos.map((photo) => {
        if (photo.location) {
          if (!top || photo.location[0] > top) {
            top = parseFloat(photo.location[0])
          }
          if (!bottom || photo.location[0] < bottom) {
            bottom = parseFloat(photo.location[0])
          }
          if (!left || photo.location[1] < left) {
            left = parseFloat(photo.location[1])
          }
          if (!right || photo.location[1] > right) {
            right = parseFloat(photo.location[1])
          }
        }
        return true
      })

      // Default to show the whole world if none of the current photos have locations
      let bounds = [['-45', '-1'], ['45', '1']]
      if (top && bottom && left && right) {
        bounds = [[bottom.toFixed(8), left.toFixed(8)], [top.toFixed(8), right.toFixed(8)]]
      }

      return <MapView photos={this.props.photos} bounds={bounds} hideAttribution={this.props.hideAttribution} />
    }

    if (this.props.location) {
      return <MapView location={this.props.location} zoom={this.props.zoom} hideAttribution={this.props.hideAttribution} />
    }
  }
}
