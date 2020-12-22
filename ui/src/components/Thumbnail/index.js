import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'

import star from '../../static/images/star.svg'
import starOutline from '../../static/images/star_outline.svg'

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
const Stars = styled('span')`
  position: relative;
  top: -18px;
  left: 1px;
  img {
    width: 16px;
    height: 16px;
    filter: invert(1);
  }
`

const Thumbnail = ({id, imageUrl, starRating, onStarRatingChange}) => {
  const [displayStars, setDisplayStars] = useState(starRating > 0)
  const [starHovering, setStarHovering] = useState(starRating)

  const onStarEnter = (num) => { setStarHovering(num); setDisplayStars(true) }
  const onStarLeave = () => { setStarHovering(starRating); setDisplayStars(starRating > 0) }
  const onStarClick = (num, e) => {
    e.preventDefault()
    if (starRating == num) {
      onStarRatingChange(0)
    }
    else {
      onStarRatingChange(num)
    }
  }

  return (
    <Link to={`/photo/${id}`} key={id}>
      <Container>
        <Image style={{backgroundImage: 'url(' + imageUrl + ')'}} />
        <Stars style={{opacity: displayStars ? 1 : 0}}>
          <img src={starHovering >= 1 ? star : starOutline} onMouseEnter={() => onStarEnter(1)} onMouseLeave={() => onStarLeave()} onClick={(e) => onStarClick(1, e)} key="1" />
          <img src={starHovering >= 2 ? star : starOutline} onMouseEnter={() => onStarEnter(2)} onMouseLeave={() => onStarLeave()} onClick={(e) => onStarClick(2, e)} key="2" />
          <img src={starHovering >= 3 ? star : starOutline} onMouseEnter={() => onStarEnter(3)} onMouseLeave={() => onStarLeave()} onClick={(e) => onStarClick(3, e)} key="3" />
          <img src={starHovering >= 4 ? star : starOutline} onMouseEnter={() => onStarEnter(4)} onMouseLeave={() => onStarLeave()} onClick={(e) => onStarClick(4, e)} key="4" />
          <img src={starHovering >= 5 ? star : starOutline} onMouseEnter={() => onStarEnter(5)} onMouseLeave={() => onStarLeave()} onClick={(e) => onStarClick(5, e)} key="5" />
        </Stars>
      </Container>
    </Link>
  )
}

export default Thumbnail
