import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'
import StarRating from '../StarRating'
import { PHOTO_UPDATE } from '../../graphql/photo'
import { useMutation } from '@apollo/react-hooks'
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';

const Container = styled('li')`
  width: 128px;
  height: 128px;

  img {
    width: 128px;
    height: 128px;
  }

  border: 1px solid #888;
  list-style: none;
  margin: 0 20px 20px 0;
  display: inline-block;
  box-shadow: 0 2px 6px 1px rgba(0, 0, 0, 0.5);
  background: #292929;
  overflow: hidden;
  cursor: pointer;
  div {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
  }
  @media all and (max-width: 700px) {
    width: 96px;
    height: 96px;

    img {
      width: 96px;
      height: 96px;
    }
  }
`
const Image = styled('div')`
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
`
const StarRatingStyled = styled('span')`
  position: relative;
  top: -25px;
  left: 1px;
`

const Thumbnail = ({ id, imageUrl, starRating, onStarRatingChange }) => {
  const [newStarRating, updateStarRating] = useState(starRating)
  useEffect(() => {
    updateStarRating(starRating)
  }, [starRating])
  const [updatePhoto] = useMutation(PHOTO_UPDATE)
  const onStarClick = (num, e) => {
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

  return (
    <Link to={`/photo/${id}`} key={id}>
      <Container>
        <LazyLoadImage effect="opacity" src={imageUrl} />
        <StarRatingStyled>
          <StarRating starRating={newStarRating} onStarClick={onStarClick} />
        </StarRatingStyled>
      </Container>
    </Link>
  )
}

export default Thumbnail
