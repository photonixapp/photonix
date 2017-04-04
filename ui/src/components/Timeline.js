import React, { PropTypes } from 'react'
import '../../static/css/Timeline.css'


const Timeline = ({ photos, onPhotoClick }) => (
  <div className="Timeline">
    <ul className="thumbnails">
      {photos.map(photo =>
        <li className="thumbnail" key={photo.id} onClick={() => onPhotoClick(photo.id)}>
          {photo.thumbnail}
        </li>
      )}
    </ul>
  </div>
)

export default Timeline
