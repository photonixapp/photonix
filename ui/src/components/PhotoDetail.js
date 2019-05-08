import React from 'react'
import createHistory from 'history/createBrowserHistory'

import BoundingBoxes from './BoundingBoxes'
import MapViewContainer from '../containers/MapViewContainer'
import ColorTags from './ColorTags'

import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import { ReactComponent as ArrowDownIcon } from '../static/images/arrow_down.svg'
import '../static/css/PhotoDetail.css'

const history = createHistory()

const PhotoDetail = ({ photoId, photo }) => {
  let boxes = photo.objectTags.map((objectTag) => {
    return {
      name: objectTag.tag.name,
      positionX: objectTag.positionX,
      positionY: objectTag.positionY,
      sizeX: objectTag.sizeX,
      sizeY: objectTag.sizeY,
    }
  })

  let location = null
  if (photo.location) {
    location = [null, null]
    location[0] = parseFloat(photo.location.split(',')[0])
    location[1] = parseFloat(photo.location.split(',')[1])
  }

  return (
    <div className="PhotoDetail" style={{backgroundImage: `url('/thumbnails/3840x3840_contain_q75/${photoId}/')`}}>
      <div className="content">
        <div className="metadata">
          <div className="boxes">
            <div className="box">
              <h2>Camera</h2>
              <ul>
                {photo.camera ? <li>{photo.camera.make} {photo.camera.model}</li> : ''}
                <li>Aperture: {photo.aperture}</li>
                <li>Exposure: {photo.exposure}</li>
                <li>ISO speed: {photo.isoSpeed}</li>
                <li>Focal length: {photo.focalLength}</li>
                <li>Flash: {photo.flash ? 'ON' : 'OFF'}</li>
                <li>Metering mode: {photo.meteringMode}</li>
                {photo.driveMode ? <li>Drive mode: {photo.driveMode}</li> : ''}
                {photo.shootingMode ? <li>Shooting mode: {photo.shootingMode}</li> : ''}
              </ul>
            </div>
            {
              photo.locationTags.length
              ?
              <div className="box">
                <h2>Locations</h2>
                <ul>
                  {
                    photo.locationTags.map((photoTag, index) => (
                      <li key={index}>{photoTag.tag.name}</li>
                    ))
                  }
                </ul>
              </div>
              :
              ''
            }
            {
              photo.location
              ?
              <div className="box">
                <h2>Map</h2>
                <div className="map">
                {
                  <MapViewContainer location={location} hideAttribution={true} zoom={6} />
                }
                </div>
              </div>
              :
              ''
            }
            {
              photo.colorTags.length
              ?
              <div className="box">
                <h2>Colors</h2>
                <ColorTags tags={photo.colorTags.map((item) => (item.tag))} />
              </div>
              :
              ''
            }
            {
              photo.objectTags.length
              ?
              <div className="box">
                <h2>Objects</h2>
                <ul>
                  {
                    photo.objectTags.map((photoTag, index) => (
                      <li key={index}>{photoTag.tag.name}</li>
                    ))
                  }
                </ul>
              </div>
              :
              ''
            }
            {
              photo.styleTags.length
              ?
              <div className="box">
                <h2>Styles</h2>
                <ul>
                  {
                    photo.styleTags.map((photoTag, index) => (
                      <li key={index}>{photoTag.tag.name}</li>
                    ))
                  }
                </ul>
              </div>
              :
              ''
            }
          </div>
        </div>
      </div>
      <div className="boundingBoxesContainer">
        <BoundingBoxes photoWidth={photo.width} photoHeight={photo.height} boxes={boxes} />
      </div>
      <div className="closeIcon" title="[Esc] or [Backspace]">
        <CloseIcon alt="Close" onClick={history.goBack} />
      </div>
      <div className="scrollHint">
        <ArrowDownIcon className="img1" alt="" />
        <ArrowDownIcon className="img2" alt="" />
        <ArrowDownIcon className="img3" alt="" />
      </div>
    </div>
  )
}

export default PhotoDetail
