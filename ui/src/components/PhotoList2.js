import React from 'react'
import { Link } from 'react-router-dom'
import '../static/css/PhotoList.css'


const PhotoList2 = ({ photoSections, onScroll, onMouseDown, containerRef, scrollbarHandleRef, displayScrollbar, selectedSection }) => (
  <div className="PhotoList">
    <div className="PhotoListScroller" onScroll={onScroll} ref={containerRef}>
      <ul className="thumbnails">
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
    </div>
    <div className="Histogram flex-container-column">
      {
        photoSections.map((section, index) => {
          let width = -1 * ((section.segments[0].numPhotos / 100) * 200)
          return <div className="Bar flex-container-row" key={index} style={{marginLeft: width + `px`}} />
        })
      }
    </div>
    <div className="Scrollbar" ref={scrollbarHandleRef} style={{opacity: displayScrollbar ? 1 : null}} onMouseDown={onMouseDown}></div>
  </div>
)

export default PhotoList2
