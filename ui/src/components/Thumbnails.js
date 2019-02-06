import React from 'react'
import { Link } from 'react-router-dom'

import '../static/css/Thumbnails.css'


const Thumbnails = ({ photoSections }) => (
  <ul className="Thumbnails">
    {
      photoSections ?
      photoSections.map((section) => {
        return (
          <div className="section" id={section.id} key={section.id}>
            <h2>{section.title}</h2>
            {
              section.segments.map((segment) => (
                segment.photos.map((photo) => (
                  <Link to={'/photo/' + photo.id} key={photo.id}>
                    <li className="thumbnail">
                      <div className="image" style={{backgroundImage: 'url(' + photo.thumbnail + ')'}} />
                    </li>
                  </Link>
                ))
              ))
            }
          </div>
        )
      })
      : null
    }
  </ul>
)

export default Thumbnails
