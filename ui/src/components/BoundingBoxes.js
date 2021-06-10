import React, { useState } from 'react'
import styled from '@emotion/styled'
import { ReactComponent as EditIcon } from '../static/images/edit_white.svg'
import { ReactComponent as BlockIcon } from '../static/images/block_white.svg'

const Container = styled('div')`
  width: 100%;
  height: 100%;
  position: relative;

  .FeatureBox {
    border: 3px solid rgba(255, 0, 0, 0.75);
    position: absolute;
    border-radius: 6px;
    overflow: hidden;
    .FeatureLabel {
      color: #fff;
      font-size: 14px;
      background-color: rgba(255, 0, 0, 0.75);
      display: inline-block;
      overflow: hidden;
      max-width: 100%;
      padding: 1px 7px 2px 4px;
      float: left;
      text-align: left;
      white-space: nowrap;
      pointer-events: all;
      &:hover {
        overflow: visible;
        text-shadow: 0 0 2px #f00;
      }
    }
    &.face {
      border-color: rgba(255, 255, 0, 0.75);
      .FeatureLabel {
        color: #000;
        background-color: rgba(255, 255, 0, 0.75);
        &:hover {
          text-shadow: 0 0 2px #ff0;
        }
      }
      .FeatureIconEdit {
        position: absolute;
        bottom: 0px;
        right: 3px;
      }
      .FeatureIconDelete {
        position: absolute;
        bottom: 0px;
        right: 30px;
      }
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

const BoundingBoxes = ({ boxes, className }) => {
  const [editMode, setEditMode] = useState(false)
  return (
    <Container>
      {boxes?.map((box, index) => {
        let left = (box.positionX - box.sizeX / 2) * 100 + '%'
        let top = (box.positionY - box.sizeY / 2) * 100 + '%'
        let width = box.sizeX * 100 + '%'
        let height = box.sizeY * 100 + '%'
        return (
          <div
            className={`FeatureBox ${className}`}
            key={index}
            style={{ left: left, top: top, width: width, height: height }}
          >
            <div className="FeatureLabel" key={index}>
              {console.log(editMode)}
              {box.name}
            </div>
            {className === 'face' && (
              <>
                <EditIcon
                  alt="Edit"
                  className="FeatureIconEdit"
                  onClick={() => setEditMode(!editMode)}
                />
                <BlockIcon
                  alt="Block"
                  className="FeatureIconDelete"
                  onClick={() => setEditMode(!editMode)}
                />
              </>
            )}
          </div>
        )
      })}
    </Container>
  )
}

export default BoundingBoxes
