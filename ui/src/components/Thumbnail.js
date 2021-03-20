import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'
import StarRating from './StarRating'
import { PHOTO_UPDATE } from '../graphql/photo'
import { useMutation } from '@apollo/react-hooks'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/opacity.css'

const Container = styled('li')`
  width: 130px;
  height: 130px;
  border: 1px solid #888;
  list-style: none;
  margin: 0 20px 20px 0;
  display: inline-block;
  box-shadow: 0 2px 6px 1px rgba(0, 0, 0, 0.5);
  background: #292929;
  overflow: hidden;
  cursor: pointer;
  position: relative;

  img.thumbnail {
    width: 100%;
    height: 100%;
    display: block;
  }

  .thumbnail-wrapper {
    display: block !important;
  }

  @media all and (max-width: 1000px) {
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

const Thumbnail = ({ id, imageUrl, starRating, onStarRatingChange }) => {
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
    <Link to={`/photo/${id}`} key={id}>
      <Container>
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
      </Container>
    </Link>
  )
}

export default Thumbnail
