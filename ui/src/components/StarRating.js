import React, { useState, useEffect, useCallback } from 'react'
import styled from '@emotion/styled'
import PropTypes from 'prop-types'

import { ReactComponent as StarIcon } from '../static/images/star.svg'
import { ReactComponent as StarOutlineIcon } from '../static/images/star_outline.svg'

const StarsSmall = styled('span')`
  cursor: pointer;
  svg {
    width: 16px;
    height: 16px;
    filter: invert(1);
  }
`
const StarsLarge = styled(StarsSmall)`
  svg {
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
    if (onStarClick) {
      setStarHovering(num)
      !alwaysShow && setDisplayStars(true)
    }
  }
  const onStarLeave = useCallback(() => {
    if (onStarClick) {
      setStarHovering(starRating)
      !alwaysShow && setDisplayStars(starRating > 0)
    }
  }, [alwaysShow, starRating, onStarClick])

  useEffect(() => {
    if (starHovering) {
      setDisplayStars(true)
    }
  }, [starRating, starHovering, onStarLeave])

  const Stars = large ? StarsLarge : StarsSmall

  return (
    <Stars style={{ opacity: displayStars ? 1 : 0 }}>
      {[...Array(5).keys()].map((i) => {
        const args = {
          onMouseEnter: () => onStarEnter(i + 1),
          onMouseLeave: () => onStarLeave(),
          onMouseDown: (e) => onStarClick && onStarClick(i + 1, e), // We actually use onMouseDown rather than onClick as this is the event that useLongPress uses and we need to stopPropagation
          key: i + 1,
          alt: `${i + 1} stars`,
        }
        if (starHovering >= i + 1) {
          return <StarIcon {...args} />
        } else {
          return <StarOutlineIcon {...args} />
        }
      })}
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
