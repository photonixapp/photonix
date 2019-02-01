import React from 'react'
import { Link } from 'react-router-dom'
import '../static/css/PhotoList.css'


const PhotoList2 = ({ photos, onScroll, onMouseDown, containerRef, scrollbarHandleRef, displayScrollbar }) => (
  <div className="PhotoList">
    <div className="PhotoListScroller" onScroll={onScroll} ref={containerRef}>
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
    <div className="scrollbar" ref={scrollbarHandleRef} style={{opacity: displayScrollbar ? 1 : null}} onMouseDown={onMouseDown}></div>
  </div>
)

export default PhotoList2
