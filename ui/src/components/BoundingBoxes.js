import React from 'react'

import '../static/css/BoundingBoxes.css'

const BoundingBoxes = ({ photoWidth, photoHeight, boxes }) => {
  let multiplier = window.innerWidth / photoWidth
  if ((window.innerHeight / photoHeight) < multiplier) {
    multiplier = window.innerHeight / photoHeight
  }
  let displayHeight = photoHeight * multiplier
  let displayWidth = photoWidth * multiplier
  let offsetLeft = Math.round((window.innerWidth - displayWidth) / 2, 10)
  let offsetTop = Math.round((window.innerHeight - displayHeight) / 2, 10)

  return (
    <div className="BoundingBoxes">
      {
        boxes.map((box, index) => {
          let width = (box.sizeX * displayWidth) + 'px'
          let height = (box.sizeY * displayHeight) + 'px'
          let left = offsetLeft + (box.positionX * displayWidth) - (box.sizeX * displayWidth / 2) + 'px'
          let top = offsetTop + (box.positionY * displayHeight) - (box.sizeY * displayHeight / 2) + 'px'
          return (
            <div className="FeatureBox" key={index} style={{left: left, top: top, width: width, height: height}}>
              <div className="FeatureLabel" key={index}>{box.name}</div>
            </div>
          )
        })
      }
    </div>
  )
}

export default BoundingBoxes
