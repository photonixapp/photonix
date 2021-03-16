import React from 'react'
import styled from '@emotion/styled'

import Thumbnails from './Thumbnails'
import Histogram from './Histogram'

const Container = styled('div')`
  height: 100%;
  position: relative;

  :hover .Scrollbar {
    opacity: 1;
  }

  .PhotoListScroller {
    padding: 40px 99px 20px 40px;
    height: 100%;
    overflow: auto;
    margin-right: -99px;
  }

  .section h2 {
    margin: 0 0 20px 0;
    font-size: 22px;
  }

  .Scrollbar {
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.2);
    position: absolute;
    cursor: move;
    top: 10px;
    right: 10px;
    opacity: 0;
    transition: opacity 200ms;
    z-index: 10;
  }

  @media all and (max-width: 1000px) {
    .PhotoListScroller {
      padding: 40px;
      margin-right: 0;
    }
    .Scrollbar {
      opacity: 1;
    }
  }
  @media all and (max-width: 700px) {
    .PhotoListScroller {
      padding: 20px;
    }
  }
`

const PhotoList = ({
  photoSections,
  onScroll,
  onMouseDown,
  onTouchStart,
  onHistogramClick,
  containerRef,
  scrollbarHandleRef,
  displayScrollbar,
  selectedSection,
}) => (
  <Container>
    <div className="PhotoListScroller" ref={containerRef} onScroll={onScroll}>
      <Thumbnails photoSections={photoSections} />
    </div>
    <div
      className="Scrollbar"
      ref={scrollbarHandleRef}
      style={{ opacity: displayScrollbar ? 1 : null }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    ></div>
    {photoSections.length >= 5 ? (
      <Histogram
        photoSections={photoSections}
        selectedSection={selectedSection}
        onClick={onHistogramClick}
      />
    ) : null}
  </Container>
)

export default PhotoList
