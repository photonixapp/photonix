import React, { useCallback, useState, useEffect, useRef } from 'react'
import styled from '@emotion/styled'
import PropTypes from 'prop-types'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useDrag } from '@use-gesture/react'
import { useSelector } from 'react-redux'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'

import BoundingBoxes from './BoundingBoxes'
import Spinner from './Spinner'
import { getPrevNextPhotos } from '../stores/photos/selector'

// Lightweight query for just rotation data of adjacent photos
const GET_PHOTO_ROTATION = gql`
  query PhotoRotation($id: UUID) {
    photo(id: $id) {
      id
      rotation
      userRotation
    }
  }
`

const Container = styled('div')`
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #1b1b1b;
  overflow: hidden;

  .swipeOverlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 20;
    touch-action: pan-y;
  }

  .carouselTrack {
    display: flex;
    flex-direction: row;
    height: 100vh;
    will-change: transform;
    position: relative;
  }

  .carouselSlide {
    width: 100vw;
    height: 100vh;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #1b1b1b;
    position: relative;
  }

  .carouselSlidePrev,
  .carouselSlideNext {
    img {
      max-width: 100vw;
      max-height: 100vh;
      object-fit: contain;
    }
  }

  .carouselSlideCurrent {
    .react-transform-component {
      width: 100%;
      height: 100%;
    }
    .react-transform-element {
      width: 100%;
      height: 100%;
    }
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
    z-index: 10;
    pointer-events: none;
  }
`

const SPINNER_DELAY_MS = 100 // Delay before showing spinner to allow cache/etag check

const ZoomableImage = ({
  photoId,
  boxes,
  next,
  prev,
  rotation,
  exifRotation,
  refetch,
  showBoundingBox,
  setShowBoundingBox,
  setShowMetadata,
  showMetadata,
  showTopIcons,
  setShowTopIcons,
}) => {
  const [scale, setScale] = useState(1)
  const [zoom, setZoom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSpinner, setShowSpinner] = useState(false)
  const [displayImage, setDisplayImage] = useState(false)
  const [editLableId, setEditLableId] = useState('')
  const spinnerTimeoutRef = useRef(null)
  const transformRef = useRef(null)
  let clickTimeOut = null

  const prevNextPhotos = useSelector((state) =>
    getPrevNextPhotos(state, photoId)
  )
  const url = `/thumbnailer/photo/3840x3840_contain_q75/${photoId}/`

  const prevPhotoId = prevNextPhotos.prev[0]
  const nextPhotoId = prevNextPhotos.next[0]
  const prevUrl = prevPhotoId ? `/thumbnailer/photo/3840x3840_contain_q75/${prevPhotoId}/` : null
  const nextUrl = nextPhotoId ? `/thumbnailer/photo/3840x3840_contain_q75/${nextPhotoId}/` : null

  // Fetch rotation data for adjacent photos
  const { data: prevPhotoData } = useQuery(GET_PHOTO_ROTATION, {
    variables: { id: prevPhotoId },
    skip: !prevPhotoId,
  })
  const { data: nextPhotoData } = useQuery(GET_PHOTO_ROTATION, {
    variables: { id: nextPhotoId },
    skip: !nextPhotoId,
  })

  // Calculate rotations for adjacent photos
  const prevRotation = prevPhotoData?.photo?.rotation ?? 0
  const nextRotation = nextPhotoData?.photo?.rotation ?? 0

  // Swipe offset in pixels (during drag and animation)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const animationRef = useRef(null)
  const navigatedViaSwipeRef = useRef(false)

  const prevPhoto = useCallback(() => {
    if (!zoom && prevPhotoId) prev()
  }, [zoom, prev, prevPhotoId])

  const nextPhoto = useCallback(() => {
    if (!zoom && nextPhotoId) next()
  }, [zoom, next, nextPhotoId])

  // Animate to target offset, then call callback
  const animateTo = useCallback((targetOffset, onComplete) => {
    setIsAnimating(true)
    const startOffset = swipeOffset
    const startTime = performance.now()
    const duration = 250 // ms

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentOffset = startOffset + (targetOffset - startOffset) * eased

      setSwipeOffset(currentOffset)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        if (onComplete) onComplete()
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [swipeOffset])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Reset offset when photo changes
  useEffect(() => {
    setSwipeOffset(0)
  }, [photoId])

  // Gesture handler for swipe carousel
  const bindDrag = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], cancel }) => {
      // Don't allow swiping when zoomed or animating
      if (zoom || isAnimating) {
        cancel()
        return
      }

      setIsDragging(active)

      if (active) {
        // During drag: apply resistance at edges
        let adjustedX = mx
        if (mx > 0 && !prevPhotoId) {
          // Dragging right but no previous photo - add resistance
          adjustedX = mx * 0.3
        } else if (mx < 0 && !nextPhotoId) {
          // Dragging left but no next photo - add resistance
          adjustedX = mx * 0.3
        }
        setSwipeOffset(adjustedX)
      } else {
        // On release: check if we should navigate
        const width = window.innerWidth
        const threshold = width * 0.25
        const velocityThreshold = 0.5

        if ((mx > threshold || (vx > velocityThreshold && dx > 0)) && prevPhotoId) {
          // Swipe right - go to previous
          animateTo(width, () => {
            navigatedViaSwipeRef.current = true
            // Navigate immediately - the useEffect on photoId will reset swipeOffset
            prevPhoto()
          })
        } else if ((mx < -threshold || (vx > velocityThreshold && dx < 0)) && nextPhotoId) {
          // Swipe left - go to next
          animateTo(-width, () => {
            navigatedViaSwipeRef.current = true
            // Navigate immediately - the useEffect on photoId will reset swipeOffset
            nextPhoto()
          })
        } else {
          // Snap back to center
          animateTo(0)
        }
      }
    },
    { axis: 'x', filterTaps: true }
  )

  const handleImageLoaded = () => {
    if (loading) {
      console.log('[ZoomableImage] Image loaded, hiding spinner (was showing:', showSpinner, ')')
      // Cancel pending spinner timeout since image loaded in time
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current)
        spinnerTimeoutRef.current = null
      }
      setLoading(false)
      setShowSpinner(false)
      setTimeout(() => {
        setDisplayImage(true)
      }, 250)
    }
  }

  useEffect(() => {
    // If we navigated via swipe, skip the fade-in animation since image is already visible
    if (navigatedViaSwipeRef.current) {
      navigatedViaSwipeRef.current = false
      setLoading(false)
      setShowSpinner(false)
      setDisplayImage(true)
      setScale(1)
      return
    }

    console.log('[ZoomableImage] URL changed, starting load:', url)
    setLoading(true)
    setShowSpinner(false)
    setDisplayImage(false)
    setScale(1)

    // Delay showing spinner to allow cached images to load without flicker
    spinnerTimeoutRef.current = setTimeout(() => {
      console.log('[ZoomableImage] Spinner delay elapsed, showing spinner')
      setShowSpinner(true)
    }, SPINNER_DELAY_MS)

    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current)
        spinnerTimeoutRef.current = null
      }
    }
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

  // To handle icon show hide on single click.
  const showHideIcons = (event) => {
    if (!editLableId) {
      if (clickTimeOut !== null) {
        clearTimeout(clickTimeOut)
      } else {
        clickTimeOut = setTimeout(() => {
          // setShowFaceIcons(!showFaceIcons)
          if (showMetadata) {
            setShowMetadata(!showMetadata)
          } else {
            setShowTopIcons(!showTopIcons)
          }
          clearTimeout(clickTimeOut)
          clickTimeOut = null
        }, 300)
      }
    } else {
      setEditLableId('')
    }
  }

  let imageStyle = {
    maxWidth: '100vw',
    maxHeight: '100vh',
  }
  if (rotation === 90 || rotation === 270) {
    imageStyle.maxWidth = '100vh'
    imageStyle.maxHeight = '100vw'
  }

  // Calculate transform: start at -100vw (to show middle slide), then add swipeOffset
  const trackTransform = `translateX(calc(-100vw + ${swipeOffset}px))`

  return (
    <Container>
      {/* Transparent overlay to capture swipe gestures - prevents TransformWrapper interference */}
      {!zoom && (
        <div
          {...bindDrag()}
          className="swipeOverlay"
          onClick={showHideIcons}
          onDoubleClick={() => {
            if (transformRef.current) {
              transformRef.current.zoomIn()
            }
          }}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />
      )}
      <div
        className="carouselTrack"
        style={{
          transform: trackTransform,
        }}
      >
        {/* Previous image */}
        <div className="carouselSlide carouselSlidePrev">
          {prevUrl && (
            <img
              src={prevUrl}
              alt=""
              style={{
                maxWidth: (prevRotation === 90 || prevRotation === 270) ? '100vh' : '100vw',
                maxHeight: (prevRotation === 90 || prevRotation === 270) ? '100vw' : '100vh',
                transform: `rotate(${prevRotation}deg)`,
              }}
            />
          )}
        </div>

        {/* Current image with zoom/pan */}
        <div className="carouselSlide carouselSlideCurrent">
          <TransformWrapper
            ref={transformRef}
            key={url}
            initialScale={1}
            initialPositionX={0}
            initialPositionY={0}
            centerOnInit={false}
            wheel={{
              limitsOnWheel: false,
              step: 75,
            }}
            doubleClick={{
              mode: scale < 5 ? 'zoomIn' : 'reset',
            }}
            panning={{ disabled: !zoom }}
            onZoomChange={handleZoom}
            onPanningStop={({ scale }) => setScale(scale)}
          >
            {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
              <>
                <TransformComponent>
                  <div className="pinchArea">
                    <div className="imageFlex">
                      <div
                        className="imageWrapper"
                        onClick={showHideIcons}
                        style={{
                          transform: `rotate(${rotation}deg)`,
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          onLoad={handleImageLoaded}
                          className={displayImage ? 'display' : undefined}
                          style={imageStyle}
                        />
                        {boxes &&
                          showTopIcons &&
                          Object.keys(boxes).map((key, index) => (
                            <span
                              className={displayImage ? ' display' : undefined}
                              key={index}
                            >
                              <BoundingBoxes
                                boxes={boxes[key]}
                                className={key}
                                refetch={refetch}
                                showBoundingBox={showBoundingBox}
                                editLableId={editLableId}
                                setEditLableId={setEditLableId}
                                rotation={rotation}
                                exifRotation={exifRotation}
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
        </div>

        {/* Next image */}
        <div className="carouselSlide carouselSlideNext">
          {nextUrl && (
            <img
              src={nextUrl}
              alt=""
              style={{
                maxWidth: (nextRotation === 90 || nextRotation === 270) ? '100vh' : '100vw',
                maxHeight: (nextRotation === 90 || nextRotation === 270) ? '100vw' : '100vh',
                transform: `rotate(${nextRotation}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {!url ||
        (!displayImage && showSpinner && (
          <div className="spinnerWrapper">
            <Spinner show={showSpinner} />
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
