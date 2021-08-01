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

  .thumbnail-area {
    border-radius: 10px;
    box-shadow: 0 4px 8px 1px rgba(0, 0, 0, 0.3);
    background: #292929;
    overflow: hidden;
    transition: transform 100ms ease-in-out;
  }

  img.thumbnail {
    width: 100%;
    height: 100%;
    display: block;
  }

  .thumbnail-wrapper {
    display: block !important;
  }

  &.selectable {
  }
  &.selected .thumbnail-area {
    transform: scale(0.9);
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

  @media all and (max-width: 1920px) {
    width: 100%;
    height: 0;
    margin: 0;
    padding-bottom: 100%;
    display: block;

    img.thumbnail {
      height: auto;
    }
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
  selectable,
  selected,
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
  if (canHover && !selectable) {
    onStarClick = (num, e) => {
      e.preventDefault()
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
      <div className="thumbnail-area">
        <LazyLoadImage
          effect="opacity"
          src={imageUrl}
          className="thumbnail"
          wrapperClassName="thumbnail-wrapper"
          width="100%"
          height="100%"
        />
        <StarRatingStyled>
          <StarRating starRating={newStarRating} onStarClick={onStarClick} />
        </StarRatingStyled>
      </div>
      <div className="selection-indicator">
        <TickIcon />
      </div>
    </Container>
  )
}

Thumbnail.propTypes = {
  id: PropTypes.string,
  imageUrl: PropTypes.string,
  starRating: PropTypes.number,
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
}

export default Thumbnail
