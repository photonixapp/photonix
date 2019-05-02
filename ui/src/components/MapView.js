import React from 'react'
import { Link } from 'react-router-dom'
import { Map, Marker, Popup, TileLayer } from 'react-leaflet'
import '../static/css/Map.css'


const MapView = ({ photos, bounds, location, zoom, hideAttribution }) => {
  let markers = []
  let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  let attribution = hideAttribution ? '' : '&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors'
  let tileLayer = <TileLayer attribution={attribution} url={tileUrl} />

  if (photos) {
    markers = photos.map((photo, idx) => (
      photo.location ?
        <Marker
          key={`marker-${photo.id}`}
          position={[photo.location[0], photo.location[1]]}>
          <Popup>
            <Link to={'/photo/' + photo.id} key={photo.id}>
              <img src={photo.thumbnail} style={{ width: 128, height: 128 }} alt="marker popup" />
            </Link>
          </Popup>
        </Marker>
      :
        null
    ))

    return (
      <div className="Map">
        <Map bounds={bounds} boundsOptions={{padding: [100, 100], maxZoom: 15}}>
          {tileLayer}
          {markers}
        </Map>
      </div>
    )
  }

  else if (location) {
    markers = [
      <Marker
        key='marker'
        position={location}>
      </Marker>
    ]

    return (
      <div className="Map">
        <Map center={location} zoom={zoom} zoomControl={true}>
          {tileLayer}
          {markers}
        </Map>
      </div>
    )
  }
}

export default MapView
