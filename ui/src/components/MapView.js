import React from 'react'
import '../static/css/Map.css'
import { Map, Marker, Popup, TileLayer } from 'react-leaflet'


const MapView = ({ photos, onChange }) => (
  <div className="Map">
    <Map center={[51.505, -0.09]} zoom={4} onMoveend={onChange}>
      <TileLayer
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      />
      {photos.map((photo, idx) => (
        photo.location ?
          <Marker
            key={`marker-${photo.id}`}
            position={[photo.location[0], photo.location[1]]}>
            <Popup>
              <img src={photo.thumbnail} style={{ width: 128, height: 128 }} alt="marker popup" />
            </Popup>
          </Marker>
        :
          null
      ))}
    </Map>
  </div>
)

export default MapView
