import React, { useState } from 'react'
import styled from '@emotion/styled'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

import BoundingBoxes from './BoundingBoxes'

const Container = styled('div')`
  width: 100vw;
  height: 100vh;

  .react-transform-component {
    width: 100%;
    height: 100%;
  }
  .react-transform-element {
    width: 100%;
    height: 100%;
  }
  .pinchArea {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;

    .imageFlex {
      display: flex;
      flex-direction: row;
      .imageWrapper {
        max-width: 100%;
        max-height: 100%;
        position: relative;
        img {
          max-width: 100vw;
          max-height: 100vh;
          vertical-align: top;
        }
        .boundingBoxesContainer {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }
      }
    }
  }
`

const ZoomableImage = ({ url, boxes }) => {
  let [scale, setScale] = useState(1)

  return (
    <Container>
      <TransformWrapper
        wheel={{
          limitsOnWheel: false,
          step: 75,
        }}
        onPanningStop={({ scale }) => setScale(scale)}
        doubleClick={{
          mode: scale < 5 ? 'zoomIn' : 'reset',
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
          <>
            <TransformComponent>
              <div className="pinchArea">
                <div className="imageFlex">
                  <div className="imageWrapper">
                    <img src={url} alt="" />
                    {boxes && (
                      <span className="boundingBoxesContainer">
                        <BoundingBoxes boxes={boxes} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </Container>
  )
}

export default ZoomableImage
