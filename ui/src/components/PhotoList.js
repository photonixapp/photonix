import React from 'react'
import styled from '@emotion/styled'

import Thumbnails from './Thumbnails'

const Container = styled('div')`
  height: 100%;
  overflow-y: auto;
`

const PhotoList = ({ photoSections }) => {
  return (
    <Container>
      <Thumbnails photoSections={photoSections} />
      {/* #TODO: Add the DateHistogram feature back here */}
    </Container>
  )
}

export default PhotoList
