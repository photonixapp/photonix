import React from 'react'
import styled from '@emotion/styled'

import Thumbnails from './Thumbnails'
import useInfiniteScroll from './InfiniteScroll'

const Container = styled('div')`
  height: 100%;
  overflow-y: auto;
`

const PhotoList = ({ photoSections, refetchPhotos, refetchPhotoList }) => {
  const [scrollerRef, handleScroll] = useInfiniteScroll(refetchPhotos)

  return (
    <Container ref={scrollerRef} onScroll={handleScroll}>
      <Thumbnails photoSections={photoSections} refetchPhotoList={refetchPhotoList} />
      {/* #TODO: Add the DateHistogram feature back here */}
    </Container>
  )
}

export default PhotoList
