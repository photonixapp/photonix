import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import styled from '@emotion/styled'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useMapEvent } from 'react-leaflet'
import L from 'leaflet'
import 'react-leaflet-markercluster/dist/styles.min.css' // sass

const Container = styled('div')`
  width: 100%;
  height: 100%;
  background: #000;
  position: relative;
  z-index: 1;

  .leaflet-container {
    height: 100%;
    width: 100%;
    background: none;

    .leaflet-control-attribution {
      background: #292929;
      color: #555;
      font-size: 10px;
    }
    .leaflet-tile-container {
      filter: contrast(1.03);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 4px;
    }
  }

  .leaflet-touch .leaflet-bar {
    border: 0;
  }

  .leaflet-bar {
    box-shadow: 0 4px 8px 1px rgba(0, 0, 0, 0.3);
    a {
      background-color: #383838;
      border: 0;
      color: #ddd;
      &:hover {
        background-color: #444;
        border: 0;
      }
      &.leaflet-disabled {
        opacity: 0;
      }
    }
  }

  .leaflet-popup-content {
    margin: 4px;
  }
  .leaflet-popup-close-button {
    display: none;
  }
  .leaflet-custom-icon {
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    box-shadow: 0 5px 12px rgba(0, 0, 0, 0.5);
    background: rgba(255, 255, 255, 0.25);
    overflow: hidden;
  }
`

const MapView = ({
  photos,
  bounds,
  location,
  zoom,
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
  const [zoomState, setZoomState] = useState(zoom ? zoom : 2)
  const [map, setMap] = useState(null)
  const history = useHistory()

  // Use to check the component comes back from next page or not and setStates.
  useEffect(() => {
    if (history.action === 'POP') {
      setZoomState(parseInt(localStorage.getItem('mapZoom')))
      setLatState(localStorage.getItem('lat'))
      setLngState(localStorage.getItem('lng'))
    }
  }, [history])

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
    })
    const position = [
      latState ? latState : mapEvents.getCenter().lat,
      lngState ? lngState : mapEvents.getCenter().lng,
    ]
    const zoom = zoomState ? zoomState : mapEvents.getZoom()
    if (map) map.setView(position, zoom)
    return null
  }

  const getMarkerIcon = (photoThumbnail, rotation) => {
    return new L.divIcon({
      iconSize: new L.Point(50, 50),
      className: 'leaflet-custom-icon',
      html: `<img src="${photoThumbnail}" width="100%" height="100%" style="transform: rotate(${rotation}deg)" />`,
    })
  }

  if (photos) {
    markers = photos.map((photo, idx) =>
      photo.location ? (
        <Marker
          key={`marker-${photo.id}`}
          icon={getMarkerIcon(photo.thumbnail, photo.rotation)}
          position={[photo.location[0], photo.location[1]]}
          eventHandlers={{
            click: () => {
              history.push(`/photo/${photo.id}`)
            },
          }}
        />
      ) : null
    )
    return (
      <Container>
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [100, 100], maxZoom: maxZoom }}
          zoom={zoomState}
          center={[latState, lngState]}
          whenCreated={(map) => {
            setMap(map)
          }}
        >
          {tileLayer}
          <MapEvents />
          <MarkerClusterGroup>{markers}</MarkerClusterGroup>
        </MapContainer>
      </Container>
    )
  } else if (location) {
    markers = [<Marker key="marker" position={location}></Marker>]
    return (
      <Container>
        <MapContainer center={location} zoomControl={true} zoom={zoomState}>
          {tileLayer}
          <MarkerClusterGroup>{markers}</MarkerClusterGroup>
        </MapContainer>
      </Container>
    )
  }
}

MapView.propTypes = {
  photos: PropTypes.array,
  bounds: PropTypes.func,
  location: PropTypes.array,
  zoom: PropTypes.number,
  maxZoom: PropTypes.number,
  hideAttribution: PropTypes.bool,
}

MapView.defaultProps = {
  maxZoom: 15,
}

export default MapView
