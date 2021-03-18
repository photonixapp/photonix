import React, { useState, useEffect } from 'react'
import { useMutation } from '@apollo/react-hooks'
import styled from '@emotion/styled'
import useLocalStorageState from 'use-local-storage-state'

import history from '../history'
import BoundingBoxes from './BoundingBoxes'
import MapView from '../components/MapView'
import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'
import EditableTags from '../components/EditableTags'
import ImageHistogram from '../components/ImageHistogram'
import StarRating from './StarRating'
import { PHOTO_UPDATE } from '../graphql/photo'

import { ReactComponent as ArrowBackIcon } from '../static/images/arrow_back.svg'
import { ReactComponent as ArrowDownIcon } from '../static/images/arrow_down.svg'
import { ReactComponent as EditIcon } from '../static/images/edit.svg'
import { ReactComponent as VisibilityIcon } from '../static/images/visibility.svg'
import { ReactComponent as VisibilityOffIcon } from '../static/images/visibility_off.svg'

const Container = styled('div')`
   {
    width: 100vw;
    height: 100vh;
    background-color: #1b1b1b;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    overflow: hidden;
  }

  .content {
    width: 110vw;
    height: 100vh;
    overflow: auto;
    position: absolute;
    z-index: 1;
  }

  .metadata {
    padding-top: 100vh;
    min-height: 200px;
    width: 100vw;
  }
  .metadata h2 {
    font-size: 18px;
    margin: 0 0 20px 0;
  }
  .metadata .boxes {
    background: rgba(0, 0, 0, 0.75);
    padding: 40px 0 0 40px;
  }
  .metadata .boxes .box {
    display: inline-block;
    width: 220px;
    vertical-align: top;
    margin: 0 40px 40px 0;
  }
  .metadata .boxes .box h2 svg {
    filter: invert(0.9);
    height: 24px;
    width: 24px;
    margin: 0px 0px -6px 10px;
    vertical-align: 0;
    padding: 2px;
    cursor: pointer;
  }

  .metadata .boxes .box ul {
    padding: 0;
    list-style: none;
    margin: 0;
  }

  .metadata .boxes .histogram {
    margin-top: 16px;
  }
  .metadata .boxes .map {
    width: auto;
    height: 150px;
    border: 1px solid #888;
  }

  .BoundingBoxesContainer {
    width: 100%;
    height: 100%;
    position: fixed;
  }

  .backIcon {
    position: fixed;
    top: 40px;
    top: max(40px, env(safe-area-inset-top));
    padding: 5px;
    left: 10px;
    left: max(10px, env(safe-area-inset-left));
    cursor: pointer;
    z-index: 10;
  }
  /* .isMobileApp .backIcon {
  top: 40px;
} */
  .backIcon svg {
    filter: invert(0.9);
  }

  .scrollHint {
    position: absolute;
    width: 100%;
    bottom: 20px;
  }
  @keyframes example {
    0% {
      opacity: 0;
    }
    25% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 0;
    }
  }
  .scrollHint svg {
    filter: invert(0.9);
    transition: all 600ms;
    transition-timing-function: ease-in-out;
    display: block;
    margin: 0 auto -15px;
    opacity: 0;
    animation-name: example;
    animation-duration: 1600ms;
    animation-iteration-count: 3;
  }
  .scrollHint svg.img1 {
    animation-delay: 0ms;
  }
  .scrollHint svg.img2 {
    animation-delay: 200ms;
  }
  .scrollHint svg.img3 {
    animation-delay: 400ms;
  }

  /* When two boxes can no longer fit next to each other */
  @media all and (max-width: 500px) {
    .metadata .boxes .box {
      width: 100%;
    }
    .metadata .boxes .histogram {
      margin-right: 40px;
    }
    .metadata .boxes .map {
      margin-right: 40px;
    }
  }
`

const PhotoDetail = ({ photoId, photo, refetch }) => {
  const [starRating, updateStarRating] = useState(photo.starRating)
  const [editorMode, setEditorMode] = useState(false)
  const [showBoundingBox, setShowBoundingBox] = useLocalStorageState(
    'showObjectBoxes',
    true
  )
  const [updatePhoto] = useMutation(PHOTO_UPDATE)

  useEffect(() => {
    updateStarRating(photo.starRating)
  }, [photo.starRating])

  const onStarClick = (num, e) => {
    if (starRating === num) {
      updateStarRating(0)
      updatePhoto({
        variables: {
          photoId: photoId,
          starRating: 0,
        },
      }).catch((e) => {})
    } else {
      updateStarRating(num)
      updatePhoto({
        variables: {
          photoId: photoId,
          starRating: num,
        },
      }).catch((e) => {})
    }
  }

  const updateboundingBoxVisibility = (val) => {
    setShowBoundingBox(val)
  }

  let boxes = photo.objectTags.map((objectTag) => {
    return {
      name: objectTag.tag.name,
      positionX: objectTag.positionX,
      positionY: objectTag.positionY,
      sizeX: objectTag.sizeX,
      sizeY: objectTag.sizeY,
    }
  })

  let location = null
  if (photo.location) {
    location = [null, null]
    location[0] = parseFloat(photo.location.split(',')[0])
    location[1] = parseFloat(photo.location.split(',')[1])
  }

  if (photo.takenAt) {
    var date = new Date(photo.takenAt)
    date = new Intl.DateTimeFormat().format(date)
  }

  return (
    <Container
      style={{
        backgroundImage: `url('/thumbnailer/photo/3840x3840_contain_q75/${photoId}/')`,
      }}
    >
      <div className="content">
        <div className="metadata">
          <div className="boxes">
            <div className="box">
              <StarRating
                starRating={starRating}
                onStarClick={onStarClick}
                large={true}
                alwaysShow={true}
              />
              <div className="histogram">
                <ImageHistogram
                  imageUrl={`/thumbnailer/photo/3840x3840_contain_q75/${photoId}/`}
                />
              </div>
            </div>
            <div className="box">
              <h2>Camera</h2>
              <ul>
                {photo.camera ? (
                  <li>
                    {photo.camera.make} {photo.camera.model}
                  </li>
                ) : (
                  ''
                )}
                {date ? <li>Date: {date}</li> : ''}
                <li>Aperture: {photo.aperture}</li>
                <li>Exposure: {photo.exposure}</li>
                <li>ISO speed: {photo.isoSpeed}</li>
                <li>Focal length: {photo.focalLength}</li>
                <li>Flash: {photo.flash ? 'ON' : 'OFF'}</li>
                <li>Metering mode: {photo.meteringMode}</li>
                {photo.driveMode ? <li>Drive mode: {photo.driveMode}</li> : ''}
                {photo.shootingMode ? (
                  <li>Shooting mode: {photo.shootingMode}</li>
                ) : (
                  ''
                )}
              </ul>
            </div>
            {photo.locationTags.length ? (
              <div className="box">
                <h2>Locations</h2>
                <HierarchicalTagsContainer
                  tags={photo.locationTags.map((item) => {
                    let newItem = item.tag
                    newItem.parent = item.parent
                    return newItem
                  })}
                />
              </div>
            ) : (
              ''
            )}
            {photo.location ? (
              <div className="box">
                <h2>Map</h2>
                <div className="map">
                  {
                    <MapView
                      location={location}
                      hideAttribution={true}
                      zoom={6}
                    />
                  }
                </div>
              </div>
            ) : (
              ''
            )}
            {photo.colorTags.length ? (
              <div className="box">
                <h2>Colors</h2>
                <ColorTags
                  tags={photo.colorTags.map((item) => ({
                    name: item.tag.name,
                    significance: item.significance,
                  }))}
                />
              </div>
            ) : (
              ''
            )}
            {photo.objectTags.length ? (
              <div className="box">
                <h2>
                  Objects
                  {showBoundingBox ? (
                    <VisibilityIcon
                      onClick={() => updateboundingBoxVisibility(false)}
                    />
                  ) : (
                    <VisibilityOffIcon
                      onClick={() => updateboundingBoxVisibility(true)}
                    />
                  )}
                </h2>
                <ul>
                  {photo.objectTags.map((photoTag, index) => (
                    <li key={index}>{photoTag.tag.name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              ''
            )}
            {photo.styleTags.length ? (
              <div className="box">
                <h2>Styles</h2>
                <ul>
                  {photo.styleTags.map((photoTag, index) => (
                    <li key={index}>{photoTag.tag.name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              ''
            )}
            <div className="box">
              <h2>
                Tags
                <EditIcon
                  alt="Edit"
                  onClick={() => setEditorMode(!editorMode)}
                />
              </h2>
              <EditableTags
                tags={photo.genericTags}
                editorMode={editorMode}
                photoId={photoId}
                refetch={refetch}
              />
            </div>
          </div>
        </div>
      </div>
      {showBoundingBox && (
        <div className="boundingBoxesContainer">
          <BoundingBoxes
            photoWidth={photo.width}
            photoHeight={photo.height}
            boxes={boxes}
          />
        </div>
      )}
      <div className="backIcon" title="[Esc] key to go back to photo list">
        <ArrowBackIcon alt="Close" onClick={history.goBack} />
      </div>
      <div className="scrollHint">
        <ArrowDownIcon className="img1" alt="" />
        <ArrowDownIcon className="img2" alt="" />
        <ArrowDownIcon className="img3" alt="" />
      </div>
    </Container>
  )
}

export default PhotoDetail
