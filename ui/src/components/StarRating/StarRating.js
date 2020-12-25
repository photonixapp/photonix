import React, { useState,useEffect } from 'react'
import styled from '@emotion/styled'

import star from '../../static/images/star.svg'
import starOutline from '../../static/images/star_outline.svg'

const StarsSmall = styled('span')`
  cursor: pointer;
  img {
    width: 16px;
    height: 16px;
    filter: invert(1);
  }
`
const StarsLarge = styled(StarsSmall)`
  img {
    width: 24px;
    height: 24px;
  }
`

const StarRating = ({starRating, onStarClick, large=false, alwaysShow=false}) => {
  const [displayStars, setDisplayStars] = useState(alwaysShow ? true : starRating > 0)
  const [starHovering, setStarHovering] = useState(starRating)

  const onStarEnter = (num) => { setStarHovering(num); !alwaysShow && setDisplayStars(true) }
  const onStarLeave = () => { setStarHovering(starRating); !alwaysShow && setDisplayStars(starRating > 0) }
useEffect (() => {
  onStarLeave()
},[starRating])
  const Stars = large ? StarsLarge : StarsSmall
  return (
    <Stars style={{opacity: displayStars ? 1 : 0}}>
      {[...Array(5).keys()].map(i =>
        <img src={starHovering >= i+1 ? star : starOutline}
          onMouseEnter={() => onStarEnter(i+1)}
          onMouseLeave={() => onStarLeave()}
          onClick={(e) => onStarClick(i+1, e)}
          key={i+1}
          alt={`${i+1} stars`} />
      )}
    </Stars>
  )
}

export default StarRating
