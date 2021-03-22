import React, { useState, useEffect, useCallback } from 'react'
import styled from '@emotion/styled'
import PropTypes from 'prop-types'

import star from '../static/images/star.svg'
import starOutline from '../static/images/star_outline.svg'

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

const StarRating = ({
  starRating,
  onStarClick,
  large = false,
  alwaysShow = false,
}) => {
  const [displayStars, setDisplayStars] = useState(
    alwaysShow ? true : starRating > 0
  )
  const [starHovering, setStarHovering] = useState(starRating)

  const onStarEnter = (num) => {
    setStarHovering(num)
    !alwaysShow && setDisplayStars(true)
  }
  const onStarLeave = useCallback(() => {
    setStarHovering(starRating)
    !alwaysShow && setDisplayStars(starRating > 0)
  }, [alwaysShow, starRating])
  useEffect(() => {
    setDisplayStars(true)
    onStarLeave()
  }, [starRating, onStarLeave])
  const Stars = large ? StarsLarge : StarsSmall

  return (
    <Stars style={{ opacity: displayStars ? 1 : 0 }}>
      {[...Array(5).keys()].map((i) => (
        <img
          src={starHovering >= i + 1 ? star : starOutline}
          onMouseEnter={() => onStarEnter(i + 1)}
          onMouseLeave={() => onStarLeave()}
          onClick={(e) => onStarClick && onStarClick(i + 1, e)}
          key={i + 1}
          alt={`${i + 1} stars`}
        />
      ))}
    </Stars>
  )
}

StarRating.propTypes = {
  starRating: PropTypes.number,
  onStarClick: PropTypes.func,
  large: PropTypes.bool,
  alwaysShow: PropTypes.bool,
}

export default StarRating
