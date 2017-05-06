import React, { PropTypes } from 'react'
import { Link } from 'react-router-dom'
import '../../static/css/Timeline.css'


const Timeline = ({ photos, onPhotoClick }) => (
  <div className="Timeline">
    <ul className="thumbnails">
      {photos.map(photo =>
        <Link to={'/photo/' + photo.id } key={photo.id}>
          <li className="thumbnail" onClick={() => onPhotoClick(photo.id)}>
            <div className="image" style={{backgroundImage: 'url(' + photo.thumbnail + ')'}} />
          </li>
        </Link>
      )}
    </ul>
  </div>
)

export default Timeline
