import React, { PropTypes } from 'react'
import {getThumbnail} from '../utils/thumbnails'
import '../../static/css/PhotoDetail.css'


const PhotoDetail = ({ photo, onPhotoClick }) => (
  <div className="PhotoDetail" style={{backgroundImage: 'url(' + getThumbnail(photo.id, 1) + ')'}} onClick={() => onPhotoClick}></div>
)

export default PhotoDetail
