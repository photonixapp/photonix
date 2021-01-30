import React from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import '../static/css/Map.css'
import 'react-leaflet-markercluster/dist/styles.min.css' // sass

const MapView = ({ photos, bounds, location, zoom, hideAttribution }) => {
  let markers = []
  let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  let attribution = hideAttribution
    ? ''
    : '&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors'
  let tileLayer = <TileLayer attribution={attribution} url={tileUrl} />

  if (photos) {
    markers = photos.map((photo, idx) =>
      photo.location ? (
        <Marker
          key={`marker-${photo.id}`}
          position={[photo.location[0], photo.location[1]]}
        >
          <Popup>
            <Link to={'/photo/' + photo.id} key={photo.id}>
              <img
                src={photo.thumbnail}
                style={{ width: 128, height: 128 }}
                alt="marker popup"
              />
            </Link>
          </Popup>
        </Marker>
      ) : null
    )
    return (
      <div className="Map">
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [200, 200], maxZoom: 15 }}
          zoom={2}
          center={[15, 0]}
        >
          {tileLayer}
          <MarkerClusterGroup>{markers}</MarkerClusterGroup>
        </MapContainer>
      </div>
    )
  } else if (location) {
    markers = [<Marker key="marker" position={location}></Marker>]

    return (
      <div className="Map">
        <MapContainer center={location} zoom={zoom} zoomControl={true}>
          {tileLayer}
          <MarkerClusterGroup>{markers}</MarkerClusterGroup>
        </MapContainer>
      </div>
    )
  }
}

export default MapView
