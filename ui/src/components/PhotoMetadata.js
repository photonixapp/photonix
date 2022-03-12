import React, { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { useSelector } from 'react-redux'
import styled from '@emotion/styled'
import { Collapse, Select } from '@chakra-ui/core'

import MapView from '../components/MapView'
import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'
import EditableTags from '../components/EditableTags'
import ImageHistogram from '../components/ImageHistogram'
import StarRating from './StarRating'
import { PHOTO_UPDATE } from '../graphql/photo'
import { getSafeArea } from '../stores/layout/selector'

import { ReactComponent as EditIcon } from '../static/images/edit.svg'
import { ReactComponent as VisibilityIcon } from '../static/images/visibility.svg'
import { ReactComponent as VisibilityOffIcon } from '../static/images/visibility_off.svg'
import PhotoExtraData from '../components/PhotoExtraData'

const Container = styled('div')`
  position: absolute;
  top: 0;
  right: -350px;
  min-height: 200px;
  width: 350px;
  height: 100%;
  background: rgba(0,0,0,0.8);
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 40px;
  transition: right 400ms;

  &.showing {
    right: 0;
    .boxes {
      .box {
        left: 0;
      }
    }
  }

  h2 {
    font-size: 18px;
    margin: 0 0 20px 0;
  }
  .boxes {
    height: 100%
    padding: 40px 0 0 40px;
    z-index: 999;
    .box {
      vertical-align: top;
      margin: 0 40px 40px 40px;
      transition-property: left;
      left: 100px;
      position: relative;

      img {
        display: inline;
      }
      .histogram {
        margin-top: 16px;
      }
      .map {
        width: 100%;
        height: 150px;
        border: 1px solid #888;
      }
      ul {
        padding: 0;
        list-style: none;
        margin: 0;
        color: #ccc;
        user-select: text;
        li.link {
          cursor: pointer;
          text-decoration: underline;
          color: #fff;
          font-weight: 400;
        }
        li .key {
          color: #fff;
          font-weight: 400;
        }
        &.metadata {
          word-wrap: anywhere;
        }
      }
      h2 svg {
        filter: invert(0.9);
        height: 24px;
        width: 24px;
        margin: 0px 0px -6px 10px;
        vertical-align: 0;
        padding: 2px;
        cursor: pointer;
      }
    }
    .box1 {
      transition-duration: 500ms;
    }
    .box2 {
      transition-duration: 600ms;
    }
    .box3 {
      transition-duration: 700ms;
    }
    .box4 {
      transition-duration: 800ms;
    }
    .box5 {
      transition-duration: 900ms;
    }
    .box6 {
      transition-duration: 1000ms;
    }
    .box7 {
      transition-duration: 1100ms;
    }
    .box8 {
      transition-duration: 1200ms;
    }
    .box9 {
      transition-duration: 1300ms;
    }
    .box10 {
      transition-duration: 1400ms;
    }
  }

  @media all and (max-width: 500px) {
    width: 80vw;
  }
`

const PhotoMetadata = ({
  photo,
  show,
  refetch,
  showBoundingBox,
  setShowBoundingBox,
  updatePhotoFile,
}) => {
  const safeArea = useSelector(getSafeArea)
  const [starRating, updateStarRating] = useState(photo.starRating)
  const [editorMode, setEditorMode] = useState(false)
  const [metadataShow, setMetadataShow] = useState(false)
  const [updatePhoto] = useMutation(PHOTO_UPDATE)
  let boxCount = 1

  let date = null
  if (photo.takenAt) {
    date = new Date(photo.takenAt)
    date = new Intl.DateTimeFormat().format(date)
  }

  useEffect(() => {
    updateStarRating(photo.starRating)
  }, [photo.starRating])

  const onStarClick = (num, e) => {
    if (starRating === num) {
      updateStarRating(0)
      updatePhoto({
        variables: {
          photoId: photo.id,
          starRating: 0,
        },
      }).catch((e) => {})
    } else {
      updateStarRating(num)
      updatePhoto({
        variables: {
          photoId: photo.id,
          starRating: num,
        },
      }).catch((e) => {})
    }
  }
  const handleToggle = () => setMetadataShow(!metadataShow)

  const getFileName = (path) => {
    const arr = path.split('/')
    return arr[arr.length - 1]
  }

  // To show people tag list without having any blocked tag.
  const personTagsList = photo.personTags.filter(
    (personTags) => !personTags.deleted
  )

  return (
    <Container className={show && 'showing'}>
      <div className="boxes" style={{ marginTop: safeArea.top }}>
        <div className={`box box${boxCount++}`}>
          <StarRating
            starRating={starRating}
            onStarClick={onStarClick}
            large={true}
            alwaysShow={true}
          />
          <div className="histogram">
            <ImageHistogram
              imageUrl={`/thumbnailer/photo/3840x3840_contain_q75/${photo.id}/`}
            />
          </div>
        </div>
        <div className={`box box${boxCount++}`}>
          <h2>Metadata</h2>
          <ul className="metadata">
            {photo.camera ? (
              <li>
                <span className="key">Camera:</span> {photo.camera.make}{' '}
                {photo.camera.model}
              </li>
            ) : (
              ''
            )}
            {date ? (
              <li>
                <span className="key">Date:</span> {date}
              </li>
            ) : (
              ''
            )}
            <li>
              <span className="key">Path:</span> {photo?.photoFile[0]?.path}
            </li>
            <li>
              <span className="key">Aperture:</span> {photo.aperture}
            </li>
            <li>
              <span className="key">Exposure:</span> {photo.exposure}
            </li>
            <li>
              <span className="key">ISO speed:</span> {photo.isoSpeed}
            </li>
            <li>
              <span className="key">Focal length:</span> {photo.focalLength}
            </li>
            <li>
              <span className="key">Flash:</span> {photo.flash ? 'ON' : 'OFF'}
            </li>
            <li>
              <span className="key">Metering mode:</span> {photo.meteringMode}
            </li>
            {photo.driveMode ? (
              <li>
                <span className="key">Drive mode:</span> {photo.driveMode}
              </li>
            ) : (
              ''
            )}
            {photo.shootingMode ? (
              <li>
                <span className="key">Shooting mode:</span> {photo.shootingMode}
              </li>
            ) : (
              ''
            )}
            {!metadataShow && (
              <li className="link" onClick={handleToggle}>
                Show all
              </li>
            )}
            <Collapse isOpen={metadataShow}>
              <PhotoExtraData id={photo?.photoFile[0]?.id} />
            </Collapse>
            {metadataShow && (
              <li className="link" onClick={handleToggle}>
                Hide
              </li>
            )}
          </ul>
        </div>
        {photo.locationTags.length > 0 && (
          <div className={`box box${boxCount++}`}>
            <h2>Locations</h2>
            <HierarchicalTagsContainer
              tags={photo.locationTags.map((item) => {
                let newItem = { ...item.tag }
                newItem.parent = item.parent
                return newItem
              })}
            />
          </div>
        )}
        {photo.location && (
          <div className={`box box${boxCount++}`}>
            <h2>Map</h2>
            <div className="map">
              <MapView
                location={photo.location}
                hideAttribution={true}
                zoom={6}
              />
            </div>
          </div>
        )}
        {photo.colorTags.length > 0 && (
          <div className={`box box${boxCount++}`}>
            <h2>Colors</h2>
            <ColorTags
              tags={photo.colorTags.map((item) => ({
                name: item.tag.name,
                significance: item.significance,
              }))}
            />
          </div>
        )}
        {personTagsList.length > 0 && (
          <div className={`box box${boxCount++}`}>
            <h2>
              People
              {showBoundingBox ? (
                <VisibilityIcon onClick={() => setShowBoundingBox(false)} />
              ) : (
                <VisibilityOffIcon onClick={() => setShowBoundingBox(true)} />
              )}
            </h2>
            <ul>
              {personTagsList.map((photoTag, index) => (
                <li key={index}>{photoTag.tag.name}</li>
              ))}
            </ul>
          </div>
        )}
        {photo.objectTags.length > 0 && (
          <div className={`box box${boxCount++}`}>
            <h2>
              Objects
              {showBoundingBox ? (
                <VisibilityIcon onClick={() => setShowBoundingBox(false)} />
              ) : (
                <VisibilityOffIcon onClick={() => setShowBoundingBox(true)} />
              )}
            </h2>
            <ul>
              {photo.objectTags.map((photoTag, index) => (
                <li key={index}>{photoTag.tag.name}</li>
              ))}
            </ul>
          </div>
        )}
        {photo.styleTags.length > 0 && (
          <div className={`box box${boxCount++}`}>
            <h2>Styles</h2>
            <ul>
              {photo.styleTags.map((photoTag, index) => (
                <li key={index}>{photoTag.tag.name}</li>
              ))}
            </ul>
          </div>
        )}
        {photo.eventTags.length ? (
          <div className={`box box${boxCount++}`}>
            <h2>Events</h2>
            <ul>
              {photo.eventTags.map((photoTag, index) => (
                <li key={index}>{photoTag.tag.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          ''
        )}
        <div className={`box box${boxCount++}`}>
          <h2>
            Tags
            <EditIcon alt="Edit" onClick={() => setEditorMode(!editorMode)} />
          </h2>
          <EditableTags
            tags={photo.genericTags}
            editorMode={editorMode}
            photoId={photo.id}
            refetch={refetch}
          />
        </div>
        {photo.photoFile.length > 1 && (
          <div className={`box box${boxCount++}`}>
            <h2>Versions</h2>
            <Select
              defaultValue={photo.baseFileId}
              onChange={(e) => updatePhotoFile(e.target.value)}
            >
              {photo.photoFile.map((file) => (
                <option key={file.id} value={file.id}>
                  {getFileName(file.path)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </Container>
  )
}

export default PhotoMetadata
