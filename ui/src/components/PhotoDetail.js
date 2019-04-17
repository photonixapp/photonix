import React from 'react'
import createHistory from 'history/createBrowserHistory'

import BoundingBoxes from './BoundingBoxes'
import '../static/css/PhotoDetail.css'

const history = createHistory()

const PhotoDetail = ({ photoId, photo }) => {
  let boxes = photo.objectTags.map((objectTag) => {
    return {
      positionX: objectTag.positionX,
      positionY: objectTag.positionY,
      sizeX: objectTag.sizeX,
      sizeY: objectTag.sizeY,
    }
  })

  return (
    <div className="PhotoDetail" style={{backgroundImage: `url('/thumbnails/3840x3840_contain_q75/${photoId}/')`}} onClick={history.goBack}>
      <div className="content">
        <div className="metadata">
          <div className="boxes">
            <div className="box">
              <h2>Camera</h2>
              <ul>
                <li>{photo.camera.make} {photo.camera.model}</li>
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
              photo.colorTags.length
              ?
              <div className="box">
                <h2>Colors</h2>
                <ul>
                  {
                    photo.colorTags.map((photoTag, index) => (
                      <li key={index}>{photoTag.tag.name}</li>
                    ))
                  }
                </ul>
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
      <div className="BoundingBoxesContainer">
        <BoundingBoxes photoWidth={photo.width} photoHeight={photo.height} boxes={boxes} />
      </div>
    </div>
  )
}

export default PhotoDetail
