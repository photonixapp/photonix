import React from 'react'
import '../static/css/PhotoDetail.css'
import createHistory from 'history/createBrowserHistory'

const history = createHistory()

const PhotoDetail = ({ photoId }) => (
  <div className="PhotoDetail" style={{backgroundImage: `url('/thumbnails/3840x3840_contain_q75/${photoId}/')`}} onClick={history.goBack}></div>
)

export default PhotoDetail
