import React from 'react'

import '../static/css/Histogram.css'


const Histogram = ({ photoSections, selectedSection, onClick }) => (
  <div className="Histogram flex-container-column">
    {
      photoSections.map((section, index) => {
        let width = -1 * ((section.segments[0].numPhotos / 100) * 200)
        let className = 'Bar flex-container-row'
        if (selectedSection == index) {
          className += ' selected'
        }
        return <div className={className} key={index} style={{marginLeft: width + `px`}} onClick={() => onClick(index)} />
      })
    }
  </div>
)

export default Histogram
