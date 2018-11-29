import React from 'react'
import '../static/css/PhotoDetail.css'


const PhotoDetail = ({ path }) => (
  <div className="PhotoDetail" style={{backgroundImage: 'url(' + path + ')'}}></div>
)

export default PhotoDetail
