import React from 'react'

import Thumbnails from './Thumbnails'
import Histogram from './Histogram'
import '../static/css/PhotoList.css'

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
  <div className="PhotoList">
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
  </div>
)

export default PhotoList
