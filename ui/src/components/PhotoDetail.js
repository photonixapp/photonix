import React, { useState, useEffect } from 'react'

import history from '../history'
import BoundingBoxes from './BoundingBoxes'
import MapView from '../components/MapView'
import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'
import EditableTagContainer from '../containers/EditableTagContainer'
import StarRating from './StarRating'
import { PHOTO_UPDATE } from '../graphql/photo'
import { useMutation } from '@apollo/react-hooks'

import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import { ReactComponent as ArrowDownIcon } from '../static/images/arrow_down.svg'
import { ReactComponent as EditIcon } from '../static/images/edit.svg'
import { ReactComponent as VisibilityIcon } from '../static/images/visibility.svg'
import { ReactComponent as VisibilityOffIcon } from '../static/images/visibility_off.svg'
import '../static/css/PhotoDetail.css'

const LS_KEY = 'showObjectBoxes'

const PhotoDetail = ({ photoId, photo, refetch }) => {
  const [starRating, updateStarRating] = useState(photo.starRating)
  const [editorMode, setEditorMode] = useState(false)
  const [showBoundingBox, setShowBoundingBox] = useState(false)
  const [updatePhoto] = useMutation(PHOTO_UPDATE)

  useEffect(() => {
    const lsVal = JSON.parse(localStorage.getItem(LS_KEY))
    if (lsVal === null) {
      setShowBoundingBox(true)
    } else {
      setShowBoundingBox(lsVal)
    }
  }, [])

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
    localStorage.setItem(LS_KEY, val)
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
    <div
      className="PhotoDetail"
      style={{
        backgroundImage: `url('/thumbnails/3840x3840_contain_q75/${photoId}/')`,
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
                <ColorTags tags={photo.colorTags.map((item) => ({name: item.tag.name, significance: item.significance}))} />
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
              <EditableTagContainer
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
      <div className="closeIcon" title="[Esc] or [Backspace]">
        <CloseIcon alt="Close" onClick={history.goBack} />
      </div>
      <div className="scrollHint">
        <ArrowDownIcon className="img1" alt="" />
        <ArrowDownIcon className="img2" alt="" />
        <ArrowDownIcon className="img3" alt="" />
      </div>
    </div>
  )
}

export default PhotoDetail
