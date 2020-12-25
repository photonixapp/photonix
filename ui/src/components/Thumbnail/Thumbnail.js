import React from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'
import StarRating from '../StarRating'
import { setStarRating } from '../../utils/photos'
import {PHOTO_UPDATE} from '../../graphql/photo'
import { useMutation} from '@apollo/react-hooks';
const Container = styled('li')`
  width: 128px;
  height: 128px;
  border: 1px solid #888;
  list-style: none;
  margin: 0 20px 20px 0;
  display: inline-block;
  box-shadow: 0 2px 6px 1px rgba(0,0,0,.5);
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
  top: -18px;
  left: 1px;
`

const Thumbnail = ({id, imageUrl, starRating}) => {
  const [updatePhoto] = useMutation(PHOTO_UPDATE)
  const onStarClick = (num, e) => {
    e.preventDefault()
    if (starRating === num) {
      setStarRating(id, 0)
      updatePhoto({
        variables: {
          photoId:id,
          starRating:0
        }
      }).catch(e => {})
    }
    else {
      setStarRating(id, num)
      updatePhoto({
        variables: {
          photoId:id,
          starRating:num
        }
      }).catch(e => {})
    }
  }

  return (
    <Link to={`/photo/${id}`} key={id}>
      <Container>
        <Image style={{backgroundImage: 'url(' + imageUrl + ')'}} />
        <StarRatingStyled>
          <StarRating starRating={starRating} onStarClick={onStarClick} />
        </StarRatingStyled>
      </Container>
    </Link>
  )
}

export default Thumbnail
