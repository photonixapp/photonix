import React from 'react'
import styled from '@emotion/styled'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

import { ReactComponent as InfoIcon } from '../static/images/info.svg'

const Container = styled('div')`
  width: 100%;
  height: 100%;
  background: #080;
  // .react-router-modal__modal {
  //   width: 100%;
  //   height: 100%;
  // }
  .react-transform-component {
    background: #008;
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
    background: #800;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    img {
      opacity: 0.8;
      max-width: 100%;
      max-height: 100%;
    }
  }
  .showDetailIcon {
    position: absolute;
    top: 10px;
    right: 10px;
    filter: invert(0.9);
  }
`

const ZoomTest = () => {
  return (
    <Container>
      <TransformWrapper
        wheel={{
          limitsOnWheel: false,
          step: 75,
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
          <>
            <TransformComponent>
              <div className="pinchArea">
                <img
                  // src="/thumbnailer/photo/3840x3840_contain_q75/5731a2bb-1ce8-4f81-9521-5ae410b89918/"
                  src="/thumbnailer/photo/3840x3840_contain_q75/044f6a36-4281-44b5-bc95-8b5827a11e6e/"
                  alt="test"
                />
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      <InfoIcon className="showDetailIcon" height="30" width="30" />
    </Container>
  )
}

export default ZoomTest
