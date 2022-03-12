import React from 'react'
import styled from '@emotion/styled'
import PropTypes from 'prop-types'

import { ReactComponent as SpinnerIcon } from '../static/images/spinner.svg'

const Container = styled('span')`
  padding: 40px;
  display: block;
  text-align: center;
  img {
    width: 38px;
    height: 38px;
    transition: transform 250ms;
  }
`

const Spinner = ({ show, containerStyle, imageStyle }) => {
  imageStyle = { ...imageStyle }
  if (!show) {
    imageStyle.transform = 'scale(0)'
  }
  return (
    <Container style={containerStyle}>
      <SpinnerIcon style={imageStyle} />
    </Container>
  )
}

Spinner.propTypes = {
  show: PropTypes.bool,
  containerStyle: PropTypes.object,
  imageStyle: PropTypes.object,
}

Spinner.defaultProps = {
  show: true,
  containerStyle: {},
  imageStyle: {},
}

export default Spinner
