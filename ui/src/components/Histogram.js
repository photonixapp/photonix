import React from 'react'

import '../static/css/Histogram.css'


const Histogram = ({ photoSections, selectedSection, onClick }) => {
  const containerWidth = 100
  const maxWidth = 200
  let maxCount = Math.max(...photoSections.map((section) => (section.segments[0].numPhotos)))

  return <div className="Histogram flex-container-column">
    {
      photoSections.map((section, index) => {
        let scale = section.segments[0].numPhotos / maxCount
        let width = ((scale * maxWidth) - containerWidth) * -1
        let className = 'Bar flex-container-row'
        if (selectedSection === index) {
          className += ' selected'
        }
        return (
          <div className={className} key={index} style={{marginLeft: width + `px`}} onClick={() => onClick(index)}>
            <div className="Caption">{section.title}</div>
          </div>
        )
      })
    }
  </div>
}

export default Histogram
