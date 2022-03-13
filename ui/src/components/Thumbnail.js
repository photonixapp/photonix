import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import styled from '@emotion/styled'
import { useMutation } from '@apollo/client'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/opacity.css'
import classNames from 'classnames/bind'

import StarRating from './StarRating'
import { PHOTO_UPDATE } from '../graphql/photo'
import { ReactComponent as TickIcon } from '../static/images/done_black.svg'
import { Link } from 'react-router-dom'

const Container = styled('li')`
  width: 130px;
  height: 130px;
  line-height: 0;
  vertical-align: bottom;
  list-style: none;
  margin: 0 20px 20px 0;
  display: inline-block;
  cursor: pointer;
  position: relative;
  border-radius: 10px;
  background: #292929;

  &.selectable {
    background: none;
  }
  &.selected .thumbnail-area {
    transform: scale(0.9);
  }

  .thumbnail-area {
    transition: transform 100ms ease-in-out;

    .lazy-load-image-loaded {
      background: #292929;
      border-radius: 10px;
      box-shadow: 0 4px 8px 1px rgba(0, 0, 0, 0.3);
    }

    img {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 10px;
    }
  }

  .selection-indicator {
    position: absolute;
    width: 13px;
    height: 13px;
    bottom: 4px;
    right: 4px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.7);
    opacity: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
      filter: invert(0.9);
      display: none;
      width: 18px;
      height: 18px;
      margin: 0.5px;
    }
  }
  &.selectable .selection-indicator {
    opacity: 1;
  }
  &.selected .selection-indicator {
    border: 0;
    width: 22px;
    height: 22px;
    bottom: 1px;
    right: 1px;
    opacity: 1;
    background: #00a8a1;
    svg {
      display: block;
      position: absolute;
      width: 15px;
      height: 15px;
      filter: invert(1);
    }
  }
  .album-name {
    position: absolute;
    color: #fff;
    font-weight: 600;
    text-align: left;
    width: 85%;
    top: 0;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 8px;
    text-shadow: 1px 1px 3px #000;
  }

  @media all and (max-width: 1920px) {
    width: 100%;
    height: 0;
    margin: 0;
    padding-bottom: 100%;
    display: block;
  }
`
const StarRatingStyled = styled('div')`
  position: absolute;
  height: 18px;
  bottom: 2px;
  left: 5px;

  div {
    position: relative;
    top: -21px;
    left: 5px;
  }
`

const Thumbnail = ({
  id,
  imageUrl,
  starRating,
  rotation,
  selectable,
  selected,
  mode,
  rateable,
  albumId,
  albumPhotosCount,
  albumName,
  ...rest
}) => {
  const [newStarRating, updateStarRating] = useState(starRating)

  useEffect(() => {
    updateStarRating(starRating)
  }, [starRating])

  const [updatePhoto] = useMutation(PHOTO_UPDATE)

  // Only allow star ratings to be changed from here if device have hovering device (cursor/mouse/trackpad) to prevent accidentally setting it
  let onStarClick = null
  const canHover = window.matchMedia('(hover: hover)').matches
  if (canHover) {
    onStarClick = (num, e) => {
      e.stopPropagation()
      if (newStarRating === num) {
        updateStarRating(0)
        updatePhoto({
          variables: {
            photoId: id,
            starRating: 0,
          },
        }).catch((e) => {})
      } else {
        updateStarRating(num)
        updatePhoto({
          variables: {
            photoId: id,
            starRating: num,
          },
        }).catch((e) => {})
      }
    }
  }

  return (
    <Container
      className={classNames({ selectable: selectable, selected: selected })}
      data-id={id}
      {...rest}
    >
      {mode === 'ALBUMS' ? (
        <Link
          to={`?mode=albums&album_id=${albumId}&album_name=${encodeURIComponent(
            albumName
          )}`}
          key={albumId}
        >
          <div
            className="thumbnail-area"
            title={albumName.length > 8 ? albumName : null}
          >
            <LazyLoadImage
              effect="opacity"
              src={imageUrl}
              className="thumbnail"
              wrapperClassName="thumbnail-wrapper"
              width="100%"
              height="100%"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />
            {rateable && (
              <StarRatingStyled>
                <StarRating
                  starRating={newStarRating}
                  onStarClick={!selectable ? onStarClick : null}
                />
              </StarRatingStyled>
            )}
          </div>
          <div className="album-name">{albumName}</div>
        </Link>
      ) : (
        <>
          <div className="thumbnail-area">
            <LazyLoadImage
              effect="opacity"
              src={imageUrl}
              className="thumbnail"
              wrapperClassName="thumbnail-wrapper"
              width="100%"
              height="100%"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />
            {rateable && (
              <StarRatingStyled>
                <StarRating
                  starRating={newStarRating}
                  onStarClick={!selectable ? onStarClick : null}
                />
              </StarRatingStyled>
            )}
          </div>
          <div className="selection-indicator">
            <TickIcon />
          </div>
        </>
      )}
    </Container>
  )
}

Thumbnail.propTypes = {
  id: PropTypes.string,
  imageUrl: PropTypes.string,
  starRating: PropTypes.number,
  rotation: PropTypes.number,
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  mode: PropTypes.string,
  rateable: PropTypes.bool,
}

Thumbnail.defaultProps = {
  rateable: true,
}

export default Thumbnail
