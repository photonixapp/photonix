import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import { Link, useHistory } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import {useMapEvent} from "react-leaflet";
import '../static/css/Map.css'
import 'react-leaflet-markercluster/dist/styles.min.css' // sass

const MapView = ({
  photos,
  bounds,
  location,
  // zoom,
  maxZoom,
  hideAttribution,
}) => {
  let markers = []
  let tileUrl =
    'https://{s}.basemaps.cartocdn.com/spotify_dark/{z}/{x}/{y}{r}.png'
  let attribution = hideAttribution
    ? ''
    : '&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors'
  let tileLayer = <TileLayer attribution={attribution} url={tileUrl} />

  const [latState, setLatState] = useState(30)
  const [lngState, setLngState] = useState(0)
  const [zoomState, setZoomState] = useState(2)
  const [map, setMap] = useState(null);
  const history = useHistory()

  // Use to check the component comes back from next page or not and setStates.
  useEffect(() => {
    if (history.action === "POP"){
      setZoomState(parseInt(localStorage.getItem('mapZoom')))
      setLatState(localStorage.getItem('lat'))
      setLngState(localStorage.getItem('lng'))
    }
  }, [history]);

  // Use to handle map events and set new position and zoom value to map.
  const MapEvents = () => {
    const mapEvents = useMapEvent({
      zoomend: () => {
        localStorage.setItem('mapZoom', mapEvents.getZoom())
        localStorage.setItem('lat', mapEvents.getCenter().lat)
        localStorage.setItem('lng', mapEvents.getCenter().lng)
      },
      dragend: () => {
        localStorage.setItem('lat', mapEvents.getCenter().lat)
        localStorage.setItem('lng', mapEvents.getCenter().lng)
      },
  });
  const position = [latState? latState : mapEvents.getCenter().lat, lngState? lngState : mapEvents.getCenter().lng]
  const zoom = zoomState? zoomState : mapEvents.getZoom()
  if(map) map.setView(position, zoom);
  return null
  }
  
  if (photos) {
    markers = photos.map((photo, idx) =>
      photo.location ? (
        <Marker
          key={`marker-${photo.id}`}
          position={[photo.location[0], photo.location[1]]}
        >
          <Popup>
            <Link to={`/photo/${photo.id}`} key={photo.id}>
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
          boundsOptions={{ padding: [100, 100], maxZoom: maxZoom }}
          zoom={zoomState}
          center={[latState, lngState]}
          whenCreated={map => {setMap(map)}}
        >
          {tileLayer}
          <MapEvents />
          <MarkerClusterGroup>{markers}</MarkerClusterGroup>
        </MapContainer>
      </div>
    )
  } else if (location) {
    markers = [<Marker key="marker" position={location}></Marker>]

    return (
      <div className="Map">
        <MapContainer center={location} zoomControl={true}>
          {tileLayer}
          <MarkerClusterGroup>{markers}</MarkerClusterGroup>
        </MapContainer>
      </div>
    )
  }
}

MapView.propTypes = {
  photos: PropTypes.array,
  bounds: PropTypes.func,
  location: PropTypes.array,
  // zoom: PropTypes.number,
  maxZoom: PropTypes.number,
  hideAttribution: PropTypes.bool,
}

MapView.defaultProps = {
  // zoom: 2,
  maxZoom: 15,
}

export default MapView
