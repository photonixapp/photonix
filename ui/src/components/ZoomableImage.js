import React, { useCallback, useState, useEffect } from 'react'
import styled from '@emotion/styled'
import PropTypes from 'prop-types'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useSwipeable } from 'react-swipeable'
import { useSelector } from 'react-redux'

import BoundingBoxes from './BoundingBoxes'
import Spinner from './Spinner'
import { getPrevNextPhotos } from '../stores/photos/selector'

const Container = styled('div')`
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #1b1b1b;

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
        cursor: zoom-in;
        img {
          opacity: 0;
          max-width: 100vw;
          max-height: 100vh;
          vertical-align: top;
          &.display {
            opacity: 1;
            transition: opacity 250ms ease-in;
          }
        }
        > span {
          opacity: 0;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          &.display {
            opacity: 1;
            transition: opacity 1000ms ease-in;
          }
        }
      }
    }
  }

  .spinnerWrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
`

const ZoomableImage = ({ photoId, boxes, next, prev, refetch }) => {
  const [scale, setScale] = useState(1)
  const [zoom, setZoom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [displayImage, setDisplayImage] = useState(false)

  const prevNextPhotos = useSelector((state) =>
    getPrevNextPhotos(state, photoId)
  )
  const url = `/thumbnailer/photo/3840x3840_contain_q75/${photoId}/`

  const prevPhoto = useCallback(() => {
    if (!zoom) prev()
  }, [zoom, prev])

  const nextPhoto = useCallback(() => {
    if (!zoom) next()
  }, [zoom, next])

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => nextPhoto(),
    onSwipedRight: () => prevPhoto(),
  })

  const loadNextPrevImages = () => {
    let prevId = prevNextPhotos.prev[0]
    let nextId = prevNextPhotos.next[0]
    if (prevId) {
      const prevImg = new Image()
      prevImg.src = `/thumbnailer/photo/3840x3840_contain_q75/${prevId}/`
    }
    if (nextId) {
      const nextImg = new Image()
      nextImg.src = `/thumbnailer/photo/3840x3840_contain_q75/${nextId}/`
    }
  }

  const handleImageLoaded = () => {
    if (loading) {
      setLoading(false)
      setTimeout(() => {
        setDisplayImage(true)
        loadNextPrevImages()
      }, 250)
    }
  }

  useEffect(() => {
    setLoading(true)
    setDisplayImage(false)
    setScale(1)
  }, [url])

  const handleZoom = (e) => {
    if (e.scale === 1 && zoom) {
      setZoom(false)
    } else if (e.scale > 1 && !zoom) {
      setTimeout(() => {
        setZoom(true)
      }, 200)
    }
  }

  return (
    <Container>
      <TransformWrapper
        key={url}
        wheel={{
          limitsOnWheel: false,
          step: 75,
        }}
        doubleClick={{
          mode: scale < 5 ? 'zoomIn' : 'reset',
        }}
        pan={{ lockAxisY: !zoom }}
        onZoomChange={handleZoom}
        onPanningStop={({ scale }) => setScale(scale)}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
          <>
            <TransformComponent>
              <div className="pinchArea">
                <div {...swipeHandlers} className="imageFlex">
                  <div className="imageWrapper">
                    <img
                      src={url}
                      alt=""
                      onLoad={handleImageLoaded}
                      className={displayImage ? 'display' : undefined}
                    />
                    {boxes &&
                      Object.keys(boxes).map((key, index) => (
                        <span
                          className={displayImage ? ' display' : undefined}
                          key={index}
                        >
                          <BoundingBoxes
                            boxes={boxes[key]}
                            className={key}
                            refetch={refetch}
                          />
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      {!url ||
        (!displayImage && loading && (
          <div className="spinnerWrapper">
            <Spinner show={loading} />
          </div>
        ))}
    </Container>
  )
}

ZoomableImage.propTypes = {
  photoId: PropTypes.string,
  boxes: PropTypes.shape({
    object: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        positionX: PropTypes.number,
        positionY: PropTypes.number,
        sizeX: PropTypes.number,
        sizeY: PropTypes.number,
      })
    ),
    face: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        positionX: PropTypes.number,
        positionY: PropTypes.number,
        sizeX: PropTypes.number,
        sizeY: PropTypes.number,
        verified: PropTypes.bool,
        deleted: PropTypes.bool,
        boxColorClass: PropTypes.string,
        showVerifyIcon: PropTypes.bool,
      })
    ),
  }),
  refetch: PropTypes.func,
}

export default ZoomableImage
