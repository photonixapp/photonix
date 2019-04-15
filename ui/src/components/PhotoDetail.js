import React from 'react'
import '../static/css/PhotoDetail.css'
import createHistory from 'history/createBrowserHistory'

const history = createHistory()

const PhotoDetail = ({ photoId, photo }) => (
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
              {photo.driveMode ? `<li>Drive mode: ${photo.driveMode}</li>` : ''}
              {photo.shootingMode ? `<li>Shooting mode: ${photo.shootingMode}</li>` : ''}
            </ul>
          </div>
          <div className="box">
            <h2>Tags</h2>
          </div>
          <div className="box">
            <h2>Map</h2>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default PhotoDetail
