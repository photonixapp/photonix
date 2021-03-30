import React, { useState, useEffect } from 'react'
import { useMutation } from '@apollo/react-hooks'
import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

import MapView from '../components/MapView'
import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'
import EditableTags from '../components/EditableTags'
import ImageHistogram from '../components/ImageHistogram'
import StarRating from './StarRating'
import { PHOTO_UPDATE } from '../graphql/photo'
import { ReactComponent as EditIcon } from '../static/images/edit.svg'
import { ReactComponent as VisibilityIcon } from '../static/images/visibility.svg'
import { ReactComponent as VisibilityOffIcon } from '../static/images/visibility_off.svg'

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
        li {
          a {
            color: #ddd;
          }
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
}) => {
  const [starRating, updateStarRating] = useState(photo.starRating)
  const [editorMode, setEditorMode] = useState(false)
  const [updatePhoto] = useMutation(PHOTO_UPDATE)

  let date = null
  if (photo.takenAt) {
    date = new Date(photo.takenAt)
    date = new Intl.DateTimeFormat().format(date)
  }

  let location = null
  if (photo.location) {
    location = [null, null]
    location[0] = parseFloat(photo.location.split(',')[0])
    location[1] = parseFloat(photo.location.split(',')[1])
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

  return (
    <Container className={show && 'showing'}>
      <div className="boxes">
        <div className="box box1">
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
        <div className="box box2">
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
            <li><Link to={`/metadata/${photo?.photoFile[0]?.id}`}>More details</Link></li>
          </ul>
        </div>
        {photo.locationTags.length ? (
          <div className="box box3">
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
          <div className="box box4">
            <h2>Map</h2>
            <div className="map">
              {<MapView location={location} hideAttribution={true} zoom={6} />}
            </div>
          </div>
        ) : (
          ''
        )}
        {photo.colorTags.length ? (
          <div className="box box5">
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
          <div className="box box6">
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
        ) : (
          ''
        )}
        {photo.styleTags.length ? (
          <div className="box box7">
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
        <div className="box box8">
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
        <div className="box box8">
          <h2>
            Path
          </h2>
          <p>{photo?.photoFile[0]?.path}</p>
        </div>
      </div>
    </Container>
  )
}

export default PhotoMetadata
