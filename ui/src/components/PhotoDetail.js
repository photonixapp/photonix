import React, { PropTypes } from 'react'
import '../../static/css/PhotoDetail.css'


const PhotoDetail = ({ photo, onPhotoClick }) => (
  <div className="PhotoDetail" style={{backgroundImage: 'url(' + photo.path + ')'}} onClick={onPhotoClick}></div>
)

export default PhotoDetail
