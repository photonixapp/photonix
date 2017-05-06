import React, { PropTypes } from 'react'
import '../../static/css/Map.css'
import { Map, Marker, Popup, TileLayer } from 'react-leaflet'

const MapView = () => (
  <div className="Map">
    <Map center={[51.505, -0.09]} zoom={13}>
      <TileLayer
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
      />
      <Marker position={[51.505, -0.09]}>
        <Popup>
          <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
        </Popup>
      </Marker>
    </Map>
  </div>
)

export default MapView
