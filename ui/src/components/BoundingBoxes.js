import React from 'react'
import styled from '@emotion/styled'

const Container = styled('div')`
  width: 100%;
  height: 100%;
  position: relative;

  .FeatureBox {
    border: 3px solid rgba(255, 0, 0, 0.75);
    position: absolute;
    .FeatureLabel {
      color: #fff;
      font-size: 14px;
      background-color: rgba(255, 0, 0, 0.75);
      display: inline-block;
      overflow: hidden;
      max-width: 100%;
      padding: 0 5px 2px 2px;
      float: left;
    }
  }

  @media all and (max-width: 1000px) {
    .FeatureBox {
      border-width: 1px;
      .FeatureLabel {
        font-size: 8px;
        padding: 0 3px 1px 3px;
      }
    }
  }
`

const BoundingBoxes = ({ boxes }) => {
  return (
    <Container>
      {boxes.map((box, index) => {
        let left = (box.positionX - box.sizeX / 2) * 100 + '%'
        let top = (box.positionY - box.sizeY / 2) * 100 + '%'
        let width = box.sizeX * 100 + '%'
        let height = box.sizeY * 100 + '%'
        return (
          <div
            className="FeatureBox"
            key={index}
            style={{ left: left, top: top, width: width, height: height }}
          >
            <div className="FeatureLabel" key={index}>
              {box.name}
            </div>
          </div>
        )
      })}
    </Container>
  )
}

export default BoundingBoxes
