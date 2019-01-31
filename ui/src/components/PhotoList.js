import React from 'react'
import { Link } from 'react-router-dom'
import '../static/css/PhotoList.css'


const PhotoList = ({ photos }) => (
  <div className="PhotoList">
    <div className="PhotoListScroller">
      <ul className="thumbnails">
        {
          photos.map((photo) => (
            <Link to={'/photo/' + photo.id} key={photo.id}>
              <li className="thumbnail">
                <div className="image" style={{backgroundImage: 'url(' + photo.thumbnail + ')'}} />
              </li>
            </Link>
          ))
        }
      </ul>
    </div>
  </div>
)

export default PhotoList
